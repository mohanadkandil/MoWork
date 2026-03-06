use std::process::Command;

#[derive(serde::Serialize)]
pub struct CommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

pub fn execute_command(command: &str) -> CommandResult {
    let dangerousCommands = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:"];
    for pattern in dangerousCommands {
        if command.contains(pattern) {
            return CommandResult {
                success: false,
                stdout: String::new(),
                stderr: format!("Blocked: {}", pattern), // format! is like template literals
                exit_code: 1,
            };
        }
    }

    let output = Command::new("sh").args(["-c", command]).output();

    match output {
        Ok(output) => CommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        },
        Err(e) => CommandResult {
            success: false,
            stdout: String::new(),
            stderr: format!("Error: {}", e),
            exit_code: -1,
        },
    }
}
