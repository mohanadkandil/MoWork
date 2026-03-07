use crate::llm::{self, Message};
use crate::terminal;
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct AppState {
    pub messages: Mutex<Vec<Message>>,
    pub api_key: Mutex<String>,
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    message: String,
    state: State<'_, AppState>,
) -> Result<FrontendResponse, String> {
    let api_key = state.api_key.lock().unwrap().clone();

    if api_key.is_empty() {
        return Err("Please set your API key first".to_string());
    }

    // Add user message
    {
        let mut messages = state.messages.lock().unwrap();
        messages.push(Message {
            role: "user".to_string(),
            content: message,
        });
    }

    let messages = state.messages.lock().unwrap().clone();

    // Use streaming chat
    let reply = llm::chat_stream(app.clone(), &api_key, &messages).await?;

    // Add assistant response to history
    {
        let mut messages = state.messages.lock().unwrap();
        messages.push(Message {
            role: "assistant".to_string(),
            content: reply.message.clone(),
        });
    }

    // Handle command if present
    if let Some(command) = reply.command {
        let result = terminal::execute_command(&command);

        // Add command result to history
        {
            let mut messages = state.messages.lock().unwrap();
            messages.push(Message {
                role: "user".to_string(),
                content: format!("Command result:\n{}\n{}", result.stdout, result.stderr),
            });
        }

        // Get follow-up response (non-streaming for command results)
        let messages = state.messages.lock().unwrap().clone();
        let final_reply = llm::chat(&api_key, &messages).await?;

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
    *api_key = key;
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
