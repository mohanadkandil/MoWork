mod agent_loop;
mod commands;
mod llm;
mod memory;
mod terminal;
mod tools;

use commands::AppState;
use std::sync::Mutex;
use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_positioner::{Position, WindowExt};

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSApp, NSApplication, NSApplicationActivationPolicy};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .manage({
            // Load API key from .env file
            dotenvy::dotenv().ok();
            let api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_default();

            AppState {
                messages: Mutex::new(Vec::new()),
                api_key: Mutex::new(api_key),
            }
        })
        .setup(|app| {
            // Hide from dock on macOS
            #[cfg(target_os = "macos")]
            unsafe {
                let ns_app = NSApp();
                ns_app.setActivationPolicy_(
                    NSApplicationActivationPolicy::NSApplicationActivationPolicyAccessory,
                );
            }

            // Create tray icon
            let icon = Image::from_path("icons/icon.png").unwrap_or_else(|_| {
                Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap()
            });

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("KIRA")
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.move_window(Position::TrayBottomCenter);
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Handle window blur (click outside) to hide - only in compact mode
            let main_window = app.get_webview_window("main").unwrap();
            let window_clone = main_window.clone();
            main_window.on_window_event(move |event| {
                if let WindowEvent::Focused(false) = event {
                    // Only auto-hide if window is in compact mode (small size)
                    if let Ok(size) = window_clone.inner_size() {
                        // Compact mode is around 380x480, expanded is 1100x720
                        if size.width < 500 {
                            let _ = window_clone.hide();
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::send_message,
            commands::set_api_key,
            commands::clear_history,
            commands::set_window_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
