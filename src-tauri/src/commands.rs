use crate::llm::{self, AgentReply, Message};
use crate::terminal;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub messages: Mutex<Vec<Message>>,
    pub api_key: Mutex<String>,
}

#[tauri::command]
pub async fn send_message(
    message: String,
    state: State<'_, AppState>,
) -> Result<FrontendResponse, String> {
    let api_key = state.api_key.lock().unwrap().clone();

    if api_key.is_empty() {
        return Err("Please set your API key first".to_string());
    }

    // Block scope — lock is released when this block ends
    {
        let mut messages = state.messages.lock().unwrap();
        messages.push(Message {
            role: "user".to_string(),
            content: message,
        });
    }

    let messages = state.messages.lock().unwrap().clone();
    let reply: AgentReply = llm::chat(&api_key, &messages).await?;

    {
        let mut messages = state.messages.lock().unwrap();
        messages.push(Message {
            role: "assistant".to_string(),
            content: serde_json::to_string(&reply).unwrap(),
        });
    }

    // if let Some(x) = "if command is not null, unwrap it into x"
    if let Some(command) = reply.command {
        let result = terminal::execute_command(&command);

        {
            let mut messages = state.messages.lock().unwrap();
            messages.push(Message {
                role: "user".to_string(),
                content: format!("Command result:\n{}\n{}", result.stdout, result.stderr),
            });
        }

        let messages = state.messages.lock().unwrap().clone();
        let final_reply: AgentReply = llm::chat(&api_key, &messages).await?;

        return Ok(FrontendResponse {
            message: final_reply.message,
            command: Some(command),
            output: result.stdout,
            error: result.stderr,
            success: result.success,
        });
    }

    Ok(FrontendResponse {
        message: reply.message,
        command: None,
        output: String::new(),
        error: String::new(),
        success: true,
    })
}

#[tauri::command]
pub fn set_api_key(key: String, state: State<'_, AppState>) {
    let mut api_key = state.api_key.lock().unwrap();
    *api_key = key; // * = replace the value INSIDE the Mutex, not the Mutex itself
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) {
    let mut messages = state.messages.lock().unwrap();
    messages.clear();
}

#[derive(serde::Serialize)]
pub struct FrontendResponse {
    pub message: String,
    pub command: Option<String>,
    pub output: String,
    pub error: String,
    pub success: bool,
}
