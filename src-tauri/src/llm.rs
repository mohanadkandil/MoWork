use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AgentReply {
    pub message: String,
    pub command: Option<String>,
}

#[derive(Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct StreamDelta {
    content: Option<String>,
}

#[derive(Deserialize)]
struct StreamResponse {
    choices: Vec<StreamChoice>,
}

#[derive(Serialize, Clone)]
pub struct StreamChunk {
    pub content: String,
    pub done: bool,
}

const SYSTEM_PROMPT: &str = r#"You are KIRA, a helpful AI assistant with terminal access.

When the user asks you to run a command, include it at the START of your response in this exact format:
[[CMD: your_command_here]]

Then continue with your message. For example:
"[[CMD: ls -la]] Here are the files in your directory..."

If no command is needed, just respond normally without the [[CMD:]] tag.

Be concise and helpful."#;

pub async fn chat_stream(
    app: AppHandle,
    api_key: &str,
    messages: &[Message],
) -> Result<AgentReply, String> {
    if api_key.is_empty() {
        return Err("API key is empty".to_string());
    }

    let client = Client::new();

    let system = Message {
        role: "system".to_string(),
        content: SYSTEM_PROMPT.to_string(),
    };

    let mut all_messages = vec![system];
    all_messages.extend(messages.iter().cloned());

    let body = json!({
        "model": "minimax/minimax-m2.5",
        "messages": all_messages,
        "stream": true
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://kira.app")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {} - {}", status, error_text));
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process complete lines
        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];

                if data == "[DONE]" {
                    let _ = app.emit(
                        "stream-chunk",
                        StreamChunk {
                            content: String::new(),
                            done: true,
                        },
                    );
                    break;
                }

                // Skip comments
                if data.starts_with(":") {
                    continue;
                }

                if let Ok(parsed) = serde_json::from_str::<StreamResponse>(data) {
                    if let Some(choice) = parsed.choices.first() {
                        if let Some(content) = &choice.delta.content {
                            full_content.push_str(content);

                            let _ = app.emit(
                                "stream-chunk",
                                StreamChunk {
                                    content: content.clone(),
                                    done: false,
                                },
                            );
                        }
                    }
                }
            }
        }
    }

    // Parse command from full content
    let (message, command) = parse_response(&full_content);

    Ok(AgentReply { message, command })
}

fn parse_response(content: &str) -> (String, Option<String>) {
    // Look for [[CMD: ...]] pattern
    if let Some(start) = content.find("[[CMD:") {
        if let Some(end) = content[start..].find("]]") {
            let cmd_start = start + 6; // len of "[[CMD:"
            let cmd_end = start + end;
            let command = content[cmd_start..cmd_end].trim().to_string();

            // Remove the command tag from the message
            let mut message = String::new();
            message.push_str(&content[..start]);
            message.push_str(&content[start + end + 2..]);
            let message = message.trim().to_string();

            return (message, Some(command));
        }
    }

    (content.to_string(), None)
}

const SYSTEM_PROMPT_BASE: &str = r#"You are KIRA, a helpful AI assistant with access to the user's computer via tools.

You can execute bash commands, search files, and help with development tasks.
Be concise and helpful. When using tools, explain what you're doing briefly."#;

// Chat with tools support - returns raw JSON response for agent loop
pub async fn chat(
    api_key: &str,
    messages: &[Value],
    tools: &[Value],
    memory_context: Option<&str>,
) -> Result<Value, String> {
    let client = Client::new();

    // Build system prompt with memory context
    let system_prompt = match memory_context {
        Some(ctx) if !ctx.is_empty() => format!("{}\n\n{}", SYSTEM_PROMPT_BASE, ctx),
        _ => SYSTEM_PROMPT_BASE.to_string(),
    };

    // Prepend system message
    let mut all_messages = vec![json!({
        "role": "system",
        "content": system_prompt
    })];
    all_messages.extend(messages.iter().cloned());

    let mut body = json!({
        "model": "minimax/minimax-m2.5",
        "messages": all_messages
    });

    // Only add tools if not empty
    if !tools.is_empty() {
        body["tools"] = json!(tools);
    }

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .bearer_auth(api_key)
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://kira.app")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {} - {}", status, error_text));
    }

    response.json::<Value>().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_chat() {
        dotenvy::dotenv().ok();
        let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY not set");
        let messages = vec![json!({
            "role": "user",
            "content": "Say hello in 5 words"
        })];

        let result = chat(&api_key, &messages, &[], None).await;
        println!("{:?}", result);
        assert!(result.is_ok());
    }
}
