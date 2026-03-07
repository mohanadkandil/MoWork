use serde_json::Value;

// Raycast deep link docs: https://manual.raycast.com/deeplinks
// Format: raycast://extensions/{author}/{extension}/{command}
// Or just open any app: raycast://extensions/raycast/system/open-application?arguments={"name":"Notion"}

// Definition — what the model sees
pub fn definition() -> Value {
    serde_json::json!({
        "type": "function",
        "function": {
            "name": "raycast",
            "description": "Control apps and run Raycast commands using deep links. Use this to open apps, trigger shortcuts, run scripts, or control system settings via Raycast.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deeplink": {
                        "type": "string",
                        "description": "A Raycast deep link URL, e.g. raycast://extensions/raycast/system/open-application?arguments={\"name\":\"Notion\"}"
                    },
                    "description": {
                        "type": "string",
                        "description": "Human readable description of what this does, e.g. 'Opening Notion'"
                    }
                },
                "required": ["deeplink", "description"]
            }
        }
    })
}

// Implementation — what the function does
pub fn execute(input: &Value) -> Result<String, String> {
    let deeplink = input
        .get("deeplink")
        .and_then(|v| v.as_str())
        .ok_or("Missing deeplink parameter")?;

    let description = input
        .get("description")
        .and_then(|v| v.as_str())
        .ok_or("Missing description parameter")?;

    if !deeplink.starts_with("raycast://") {
        return Err("deeplink must start with raycast://".to_string());
    }

    // `open` on Mac opens URLs including deep links
    let output = std::process::Command::new("open")
        .arg(deeplink)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("✓ {}", description))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
