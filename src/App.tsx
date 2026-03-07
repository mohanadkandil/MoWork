import { createSignal, For, Show, onMount, createEffect, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Kira } from "./components/Kira";
import { Terminal } from "./components/Terminal";
import "./App.css";

interface Message {
  text: string;
  isUser: boolean;
  id: number;
}

interface FrontendResponse {
  message: string;
  command: string | null;
  output: string;
  error: string;
  success: boolean;
}

interface StreamChunk {
  content: string;
  done: boolean;
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
  const [msgId, setMsgId] = createSignal(0);
  const [streamingText, setStreamingText] = createSignal("");
  const [isStreaming, setIsStreaming] = createSignal(false);
  let messagesEndRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;

  // Listen for streaming chunks
  onMount(async () => {
    const unlisten = await listen<StreamChunk>("stream-chunk", (event) => {
      const chunk = event.payload;

      if (chunk.done) {
        setIsStreaming(false);
      } else if (chunk.content) {
        setStreamingText((prev) => prev + chunk.content);
      }
    });

    onCleanup(() => unlisten());
    inputRef?.focus();
  });

  createEffect(() => {
    messages();
    streamingText();
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  });

  async function sendMessage() {
    const userMessage = input().trim();
    if (!userMessage || isThinking()) return;

    const newId = msgId() + 1;
    setMsgId(newId);
    setMessages((prev) => [...prev, { text: userMessage, isUser: true, id: newId }]);
    setInput("");
    setIsThinking(true);
    setStreamingText("");
    setIsStreaming(true);

    try {
      const reply = await invoke<FrontendResponse>("send_message", { message: userMessage });

      // Add final message
      const replyId = msgId() + 1;
      setMsgId(replyId);
      setMessages((prev) => [...prev, { text: reply.message, isUser: false, id: replyId }]);
      setStreamingText("");
      setIsStreaming(false);

      if (reply.command) {
        setTerminalCommand(reply.command);
        setTerminalOutput([]);
        setTerminalVisible(true);
        setIsRunning(true);
        setTimeout(() => {
          setIsRunning(false);
          const output = reply.output || reply.error;
          setTerminalOutput(output ? output.split("\n").filter(Boolean) : ["Done."]);
        }, 400);
        setTimeout(() => setTerminalVisible(false), 3500);
      }
    } catch (err) {
      const errId = msgId() + 1;
      setMsgId(errId);
      setMessages((prev) => [...prev, { text: `Error: ${err}`, isUser: false, id: errId }]);
      setStreamingText("");
      setIsStreaming(false);
    } finally {
      setIsThinking(false);
      inputRef?.focus();
    }
  }

  async function handleSetApiKey(key: string) {
    try {
      await invoke("set_api_key", { key });
      setApiKeySet(true);
      inputRef?.focus();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <main class="app">
      <div class="window">
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>

        <div class="kira-section">
          <Kira isThinking={isThinking()} />
          <div class="kira-status">
            <span class={`status-indicator ${isThinking() ? 'thinking' : 'online'}`}></span>
            <span class="status-text">{isThinking() ? 'Thinking...' : 'Online'}</span>
          </div>
        </div>

        <Show when={!apiKeySet()}>
          <div class="onboarding-section">
            <h2>Hey, I'm KIRA</h2>
            <p>Your AI companion with terminal powers</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const inp = (e.target as HTMLFormElement).elements.namedItem("apiKey") as HTMLInputElement;
              if (inp.value.trim()) handleSetApiKey(inp.value.trim());
            }}>
              <div class="input-group">
                <input
                  type="password"
                  name="apiKey"
                  placeholder="OpenRouter API Key"
                  autofocus
                />
                <button type="submit">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </Show>

        <Show when={apiKeySet()}>
          <div class="messages-section">
            <Show when={messages().length === 0 && !isThinking()}>
              <div class="welcome">
                <p>Ask me anything or tell me to run a command</p>
                <div class="quick-actions">
                  <button onClick={() => { setInput("What can you do?"); inputRef?.focus(); }}>
                    What can you do?
                  </button>
                  <button onClick={() => { setInput("List files here"); inputRef?.focus(); }}>
                    List files
                  </button>
                  <button onClick={() => { setInput("Open VS Code"); inputRef?.focus(); }}>
                    Open VS Code
                  </button>
                </div>
              </div>
            </Show>

            <div class="messages">
              <For each={messages()}>
                {(msg) => (
                  <div class={`msg ${msg.isUser ? 'msg-user' : 'msg-kira'}`}>
                    <p>{msg.text}</p>
                  </div>
                )}
              </For>

              {/* Streaming message - separate from messages array */}
              <Show when={isStreaming() && streamingText()}>
                <div class="msg msg-kira streaming">
                  <p>{streamingText()}<span class="cursor">▋</span></p>
                </div>
              </Show>

              {/* Typing indicator when waiting but no text yet */}
              <Show when={isThinking() && !streamingText()}>
                <div class="msg msg-kira typing-msg">
                  <div class="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </Show>

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div class="input-section">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
              <div class="input-group">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Talk to KIRA..."
                  value={input()}
                  onInput={(e) => setInput(e.currentTarget.value)}
                  disabled={isThinking()}
                />
                <Show when={input().trim()}>
                  <button type="submit" disabled={isThinking()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </Show>
              </div>
            </form>
          </div>
        </Show>
      </div>

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
