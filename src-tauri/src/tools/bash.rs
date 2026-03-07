use serde_json::Value;

// Definition — what the model sees
pub fn definition() -> Value {
    serde_json::json!({
        "type": "function",
        "function": {
            "name": "bash",
            "description": "Execute a shell command on the user's machine",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to run"
                    }
                },
                "required": ["command"]
            }
        }
    })
}

// Implementation — what the function does
pub fn execute(input: &Value) -> Result<String, String> {
    let command = input
        .get("command")
        .and_then(|v| v.as_str())
        .ok_or("Missing command parameter")?;

    let blocked_commands = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:"];
    for pattern in blocked_commands {
        if command.contains(pattern) {
            return Err(format!("Blocked: {}", pattern));
        }
    }

    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args(["/C", command])
            .output()
    } else {
        std::process::Command::new("sh")
            .args(["-c", command])
            .output()
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if !stderr.is_empty() {
                Ok(format!("{}\nstderr: {}", stdout, stderr))
            } else {
                Ok(stdout)
            }
        }
        Err(e) => Err(e.to_string()),
    }
}
