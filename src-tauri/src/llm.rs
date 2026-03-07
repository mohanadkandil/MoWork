use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
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

// Keep the non-streaming version for fallback
pub async fn chat(api_key: &str, messages: &[Message]) -> Result<AgentReply, String> {
    let client = Client::new();

    let system = Message {
        role: "system".to_string(),
        content: SYSTEM_PROMPT.to_string(),
    };

    let mut all_messages = vec![system];
    all_messages.extend(messages.iter().cloned());

    let body = json!({
        "model": "minimax/minimax-m2.5",
        "messages": all_messages
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    #[derive(Deserialize)]
    struct OpenRouterResponse {
        choices: Vec<Choice>,
    }

    #[derive(Deserialize)]
    struct Choice {
        message: ChoiceMessage,
    }

    #[derive(Deserialize)]
    struct ChoiceMessage {
        content: String,
    }

    let parsed: OpenRouterResponse = response.json().await.map_err(|e| e.to_string())?;

    let content = parsed
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or("No response from model")?;

    let (message, command) = parse_response(&content);

    Ok(AgentReply { message, command })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_chat() {
        dotenvy::dotenv().ok();
        let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY not set");
        let messages = vec![Message {
            role: "user".to_string(),
            content: "Say hello in 5 words".to_string(),
        }];

        let result = chat(&api_key, &messages).await;
        println!("{:?}", result);
        assert!(result.is_ok());
    }
}
