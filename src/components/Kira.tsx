import { createSignal, createEffect, onCleanup } from "solid-js";

interface KiraProps {
  isThinking: boolean;
}

export function Kira(props: KiraProps) {
  const [eyeY, setEyeY] = createSignal(0);
  const [blinkClosed, setBlinkClosed] = createSignal(false);

  createEffect(() => {
    if (props.isThinking) {
      let dir = 1;
      let pos = 0;
      const interval = setInterval(() => {
        pos += dir * 0.3;
        if (pos >= 2) dir = -1;
        if (pos <= -2) dir = 1;
        setEyeY(pos);
      }, 60);
      onCleanup(() => clearInterval(interval));
    } else {
      setEyeY(0);
    }
  });

  createEffect(() => {
    const blinkInterval = setInterval(() => {
      if (!props.isThinking && Math.random() > 0.7) {
        setBlinkClosed(true);
        setTimeout(() => setBlinkClosed(false), 120);
      }
    }, 3500);
    onCleanup(() => clearInterval(blinkInterval));
  });

  const eyeHeight = () => blinkClosed() ? 1.5 : 7;

  return (
    <svg
      width="100"
      height="125"
      viewBox="0 0 100 125"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="kira-character"
    >
      <defs>
        <linearGradient id="skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e8c4a8" />
          <stop offset="100%" stop-color="#d4a574" />
        </linearGradient>
        <linearGradient id="hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1a1a1e" />
          <stop offset="100%" stop-color="#28282e" />
        </linearGradient>
        <linearGradient id="hoodie" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#18181b" />
          <stop offset="100%" stop-color="#09090b" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
      </defs>

      {/* Hoodie */}
      <path
        d="M20 125 L26 82 Q50 72 74 82 L80 125"
        fill="url(#hoodie)"
      />
      <ellipse cx="50" cy="80" rx="18" ry="6" fill="#1f1f23" />

      {/* Neck */}
      <rect x="43" y="65" width="14" height="16" rx="3" fill="url(#skin)" />

      {/* Face */}
      <ellipse cx="50" cy="42" rx="28" ry="30" fill="url(#skin)" />

      {/* Hair back */}
      <path
        d="M22 38 Q22 10 50 6 Q78 10 78 38 Q78 22 68 16 Q50 8 32 16 Q22 22 22 38"
        fill="url(#hair)"
      />

      {/* Left hair strand */}
      <path d="M22 38 Q18 50 22 62 Q26 66 28 58 Q24 48 28 38" fill="url(#hair)" />
      {/* Gold tip left */}
      <path d="M22 58 Q19 66 24 70" stroke="url(#accent)" stroke-width="3.5" stroke-linecap="round" fill="none" />

      {/* Right hair */}
      <path d="M78 38 Q82 46 80 52 Q77 54 75 48 Q77 44 75 38" fill="url(#hair)" />
      {/* Gold tip right */}
      <path d="M80 50 Q82 56 78 58" stroke="url(#accent)" stroke-width="3.5" stroke-linecap="round" fill="none" />

      {/* Bangs */}
      <path
        d="M28 26 Q32 36 35 40 Q38 32 40 26 Q43 34 46 38 Q49 28 52 24 Q55 32 58 36 Q62 28 65 26 Q68 34 72 40"
        fill="url(#hair)"
      />
      {/* Subtle gold streaks */}
      <path d="M29 28 Q31 33 33 37" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7" />
      <path d="M67 29 Q69 34 71 38" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7" />

      {/* Eyes */}
      <g>
        {/* Left eye */}
        <ellipse
          cx="38"
          cy={48 + eyeY()}
          rx="4.5"
          ry={eyeHeight()}
          fill="white"
          style={{ transition: "ry 0.08s ease" }}
        />
        <ellipse
          cx="39"
          cy={49 + eyeY()}
          rx="2.2"
          ry={blinkClosed() ? 0 : 2.8}
          fill="#1a1a1e"
        />
        <circle cx="40" cy={47 + eyeY()} r="0.8" fill="white" opacity={blinkClosed() ? 0 : 1} />

        {/* Right eye */}
        <ellipse
          cx="62"
          cy={48 + eyeY()}
          rx="4.5"
          ry={eyeHeight()}
          fill="white"
          style={{ transition: "ry 0.08s ease" }}
        />
        <ellipse
          cx="61"
          cy={49 + eyeY()}
          rx="2.2"
          ry={blinkClosed() ? 0 : 2.8}
          fill="#1a1a1e"
        />
        <circle cx="62" cy={47 + eyeY()} r="0.8" fill="white" opacity={blinkClosed() ? 0 : 1} />
      </g>

      {/* Eyebrows */}
      <path d="M32 38 Q38 35 44 38" stroke="#1a1a1e" stroke-width="1.2" stroke-linecap="round" fill="none" />
      <path d="M56 38 Q62 35 68 38" stroke="#1a1a1e" stroke-width="1.2" stroke-linecap="round" fill="none" />

      {/* Nose */}
      <path d="M50 51 Q51 55 50 57" stroke="#c9a080" stroke-width="1" stroke-linecap="round" fill="none" />

      {/* Mouth - subtle smile */}
      <path
        d={props.isThinking ? "M45 63 Q50 65 55 63" : "M45 62 Q50 65 55 62"}
        stroke="#b08968"
        stroke-width="1.2"
        stroke-linecap="round"
        fill="none"
      />

      {/* Earrings - gold */}
      <circle cx="22" cy="48" r="2" fill="#fbbf24" />
      <circle cx="78" cy="48" r="2" fill="#fbbf24" />

      {/* Hoodie strings */}
      <line x1="42" y1="84" x2="40" y2="98" stroke="#28282e" stroke-width="1.2" />
      <line x1="58" y1="84" x2="60" y2="98" stroke="#28282e" stroke-width="1.2" />
    </svg>
  );
}
