use crate::llm;
use crate::memory;
use crate::tools;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter};

pub type Messages = Vec<Value>;

#[derive(Clone, Serialize, Deserialize)]
pub struct ToolCallEvent {
    pub id: String,
    pub name: String,
    pub args: Value,
    pub status: String, // "running" | "done" | "error"
    pub result: Option<String>,
}

pub async fn agent_loop(
    app: AppHandle,
    api_key: &str,
    user_message: &str,
    history: &mut Messages,
) -> Result<String, String> {
    history.push(serde_json::json!({
        "role": "user",
        "content": user_message
    }));

    // get all tool definitions
    let tool_definitions = tools::all_tools();

    loop {
        // Build memory context for each iteration (may change after memory_store calls)
        let memory_context = memory::build_context();
        let ctx = if memory_context.is_empty() {
            None
        } else {
            Some(memory_context.as_str())
        };
        let response = llm::chat(api_key, &history, &tool_definitions, ctx).await?;

        let finish_reason = response
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("finish_reason"))
            .and_then(|r| r.as_str())
            .unwrap_or("stop");

        let message = response
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .ok_or("No message in response")?
            .clone();

        // add model response to history (the full message object)
        history.push(message.clone());

        if finish_reason == "tool_calls" {
            let tool_calls = message
                .get("tool_calls")
                .and_then(|c| c.as_array())
                .ok_or("No tool_calls in message")?;

            // Execute tool calls and collect results
            for tool_call in tool_calls {
                let tool_id = tool_call
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let tool_name = tool_call
                    .get("function")
                    .and_then(|f| f.get("name"))
                    .and_then(|n| n.as_str())
                    .unwrap_or("")
                    .to_string();

                let tool_args: Value = tool_call
                    .get("function")
                    .and_then(|f| f.get("arguments"))
                    .and_then(|a| a.as_str())
                    // arguments comes as a JSON string, so we parse it
                    .and_then(|a| serde_json::from_str(a).ok())
                    .unwrap_or(serde_json::json!({}));

                // Emit "running" event
                let _ = app.emit(
                    "tool-call",
                    ToolCallEvent {
                        id: tool_id.clone(),
                        name: tool_name.clone(),
                        args: tool_args.clone(),
                        status: "running".to_string(),
                        result: None,
                    },
                );

                let result = tools::execute_tool(&tool_name, &tool_args);

                let (result_content, status) = match &result {
                    Ok(output) => (output.clone(), "done"),
                    Err(e) => (format!("Tool error: {}", e), "error"),
                };

                // Emit "done" or "error" event
                let _ = app.emit(
                    "tool-call",
                    ToolCallEvent {
                        id: tool_id.clone(),
                        name: tool_name.clone(),
                        args: tool_args,
                        status: status.to_string(),
                        result: Some(result_content.clone()),
                    },
                );

                // Add each tool result to history
                history.push(serde_json::json!({
                    "role": "tool",
                    "tool_call_id": tool_id,
                    "content": result_content
                }));
            }
        } else {
            // Model is done — extract and return the final text
            let final_text = message
                .get("content")
                .and_then(|c| c.as_str())
                .unwrap_or("")
                .to_string();

            return Ok(final_text);
        }
    }
}
