import { createSignal, For, Show, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Kira } from "./components/Kira";
import { ChatBubble } from "./components/ChatBubble";
import { ChatInput } from "./components/ChatInput";
import { Terminal } from "./components/Terminal";
import "./App.css";

interface Message {
  text: string;
  isUser: boolean;
}

interface FrontendResponse {
  message: string;
  command: string | null;
  output: string;
  error: string;
  success: boolean;
}

function App() {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");
  const [isThinking, setIsThinking] = createSignal(false);
  const [terminalVisible, setTerminalVisible] = createSignal(false);
  const [terminalCommand, setTerminalCommand] = createSignal("");
  const [terminalOutput, setTerminalOutput] = createSignal<string[]>([]);
  const [isRunning, setIsRunning] = createSignal(false);
  const [apiKeySet, setApiKeySet] = createSignal(false);

  onMount(async () => {
    // Load API key from environment or prompt user
    // For now, try to set it from .env (you may want to add a settings modal later)
    try {
      // Check if there's already a key set
      const envKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (envKey) {
        await invoke("set_api_key", { key: envKey });
        setApiKeySet(true);
      }
    } catch (e) {
      console.error("Failed to set API key:", e);
    }
  });

  async function sendMessage() {
    const userMessage = input().trim();
    if (!userMessage) return;

    // Add user message
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setInput("");
    setIsThinking(true);

    try {
      // Call the Tauri backend
      const reply = await invoke<FrontendResponse>("send_message", {
        message: userMessage,
      });

      // If there's a command, show the terminal
      if (reply.command) {
        setTerminalCommand(reply.command);
        setTerminalOutput([]);
        setTerminalVisible(true);
        setIsRunning(true);

        // Show the output
        setTimeout(() => {
          setIsRunning(false);
          const output = reply.output || reply.error;
          setTerminalOutput(output ? output.split("\n").filter(Boolean) : ["Done."]);
        }, 500);

        // Hide terminal after a delay
        setTimeout(() => {
          setTerminalVisible(false);
        }, 4000);
      }

      // Add KIRA's response
      setMessages((prev) => [...prev, { text: reply.message, isUser: false }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { text: `${err}`, isUser: false },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  async function handleSetApiKey(key: string) {
    try {
      await invoke("set_api_key", { key });
      setApiKeySet(true);
    } catch (e) {
      console.error("Failed to set API key:", e);
    }
  }

  return (
    <main class="app">
      <Show when={!apiKeySet()}>
        <div class="api-key-modal">
          <div class="api-key-content">
            <h2>Welcome to KIRA</h2>
            <p>Enter your OpenRouter API key to get started</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.elements.namedItem("apiKey") as HTMLInputElement;
                if (input.value.trim()) {
                  handleSetApiKey(input.value.trim());
                }
              }}
            >
              <input
                type="password"
                name="apiKey"
                class="api-key-input"
                placeholder="sk-or-v1-..."
                autofocus
              />
              <button type="submit" class="api-key-button">
                Connect
              </button>
            </form>
          </div>
        </div>
      </Show>

      <div class="chat-container">
        {/* Chat messages */}
        <div class="messages-area">
          <For each={messages()}>
            {(msg) => <ChatBubble message={msg.text} isUser={msg.isUser} />}
          </For>
          <Show when={isThinking()}>
            <div class="thinking-indicator">
              <span class="dot-pulse"></span>
            </div>
          </Show>
        </div>

        {/* KIRA Character */}
        <div class="kira-container">
          <Kira isThinking={isThinking()} />
        </div>

        {/* Chat Input */}
        <ChatInput
          value={input()}
          onInput={setInput}
          onSubmit={sendMessage}
          disabled={isThinking() || !apiKeySet()}
        />
      </div>

      {/* Terminal Overlay */}
      <Terminal
        isVisible={terminalVisible()}
        command={terminalCommand()}
        output={terminalOutput()}
        isRunning={isRunning()}
      />
    </main>
  );
}

export default App;
