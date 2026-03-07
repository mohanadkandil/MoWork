use serde_json::Value;

// Definition — what the model sees
pub fn definition() -> Value {
    serde_json::json!({
        "type": "function",
        "function": {
            "name": "grep",
            "description": "Search for text patterns inside files. Use this to find content within files, not to find files by name (use bash with find for that).",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "The text or regex pattern to search for"
                    },
                    "path": {
                        "type": "string",
                        "description": "File or directory path to search in"
                    },
                    "recursive": {
                        "type": "boolean",
                        "description": "Search recursively in directories, default true"
                    },
                    "case_sensitive": {
                        "type": "boolean",
                        "description": "Whether search is case sensitive, default false"
                    }
                },
                "required": ["pattern", "path"]
            }
        }
    })
}

// Implementation — what the function does
pub fn execute(input: &Value) -> Result<String, String> {
    let pattern = input
        .get("pattern")
        .and_then(|v| v.as_str())
        .ok_or("Missing pattern")?;

    let path = input
        .get("path")
        .and_then(|v| v.as_str())
        .ok_or("Missing path")?;

    let recursive = input
        .get("recursive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let case_sensitive = input
        .get("case_sensitive")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let mut args: Vec<&str> = vec![];

    if recursive {
        args.push("-r");
    }

    if case_sensitive {
        args.push("-i");
    }

    args.push(pattern);
    args.push(path);

    let output = Command::new("grep")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    if stdout.is_empty() {
        Ok(format!("No matches found for '{}' in {}", pattern, path))
    } else {
        Ok(stdout)
    }
}
