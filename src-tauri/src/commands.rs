use crate::agent_loop::{self, Messages};
use std::sync::Mutex;
use tauri::{AppHandle, LogicalSize, Manager, State};

pub struct AppState {
    pub messages: Mutex<Messages>,
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

    // Get history and run agent loop
    let mut history = state.messages.lock().unwrap().clone();

    let response = agent_loop::agent_loop(app, &api_key, &message, &mut history).await?;

    // Update shared history
    *state.messages.lock().unwrap() = history;

    Ok(FrontendResponse {
        message: response,
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

#[tauri::command]
pub fn set_window_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;

    match mode.as_str() {
        "compact" => {
            // Menu bar mode: small, centered under tray
            window.set_size(LogicalSize::new(380.0, 480.0)).map_err(|e| e.to_string())?;
            window.set_always_on_top(true).map_err(|e| e.to_string())?;
            window.set_skip_taskbar(true).map_err(|e| e.to_string())?;
        }
        "expanded" => {
            // Full app mode: larger, normal window behavior
            window.set_size(LogicalSize::new(1100.0, 720.0)).map_err(|e| e.to_string())?;
            window.set_always_on_top(false).map_err(|e| e.to_string())?;
            window.set_skip_taskbar(false).map_err(|e| e.to_string())?;
            window.center().map_err(|e| e.to_string())?;
        }
        _ => return Err("Invalid mode".to_string()),
    }

    Ok(())
}

#[derive(serde::Serialize)]
pub struct FrontendResponse {
    pub message: String,
    pub command: Option<String>,
    pub output: String,
    pub error: String,
    pub success: bool,
}
