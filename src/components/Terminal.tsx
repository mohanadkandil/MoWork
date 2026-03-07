import { Show, For } from "solid-js";

interface TerminalProps {
  isVisible: boolean;
  command: string;
  output: string[];
  isRunning: boolean;
}

export function Terminal(props: TerminalProps) {
  return (
    <div class={`terminal ${props.isVisible ? "terminal-visible" : ""}`}>
      <div class="terminal-header">
        <div class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="terminal-title">Terminal</span>
      </div>
      <div class="terminal-body">
        <div class="terminal-line">
          <span class="terminal-prompt">$</span>
          <span class="terminal-command">{props.command}</span>
          <Show when={props.isRunning}>
            <span class="terminal-cursor">▋</span>
          </Show>
        </div>
        <For each={props.output}>
          {(line) => (
            <div class="terminal-output">{line}</div>
          )}
        </For>
      </div>
    </div>
  );
}
