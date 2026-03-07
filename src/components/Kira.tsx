import { createSignal, createEffect, onCleanup } from "solid-js";

interface KiraProps {
  isThinking: boolean;
}

export function Kira(props: KiraProps) {
  const [eyeY, setEyeY] = createSignal(0);
  const [blinkClosed, setBlinkClosed] = createSignal(false);

  // Eye roll animation when thinking
  createEffect(() => {
    if (props.isThinking) {
      let dir = 1;
      let pos = 0;
      const interval = setInterval(() => {
        pos += dir * 0.25;
        if (pos >= 2) dir = -1;
        if (pos <= -2) dir = 1;
        setEyeY(pos);
      }, 50);
      onCleanup(() => clearInterval(interval));
    } else {
      setEyeY(0);
    }
  });

  // Occasional blink
  createEffect(() => {
    const blinkInterval = setInterval(() => {
      if (!props.isThinking && Math.random() > 0.7) {
        setBlinkClosed(true);
        setTimeout(() => setBlinkClosed(false), 150);
      }
    }, 3000);
    onCleanup(() => clearInterval(blinkInterval));
  });

  const eyeHeight = () => blinkClosed() ? 2 : 8;

  return (
    <svg
      width="100"
      height="125"
      viewBox="0 0 100 125"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="kira-character"
      style={{ transition: "transform 0.3s ease" }}
    >
      <defs>
        <linearGradient id="skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e0b896" />
          <stop offset="100%" stop-color="#d4a574" />
        </linearGradient>
        <linearGradient id="hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1c1c1e" />
          <stop offset="100%" stop-color="#2c2c2e" />
        </linearGradient>
        <linearGradient id="hoodie" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#5b21b6" />
        </linearGradient>
        <linearGradient id="pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hoodie */}
      <path
        d="M20 125 L26 82 Q50 72 74 82 L80 125"
        fill="url(#hoodie)"
      />
      <ellipse cx="50" cy="80" rx="18" ry="6" fill="#5b21b6" />

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
      {/* Pink tip left */}
      <path d="M22 58 Q19 66 24 70" stroke="url(#pink)" stroke-width="4" stroke-linecap="round" fill="none" />

      {/* Right hair */}
      <path d="M78 38 Q82 46 80 52 Q77 54 75 48 Q77 44 75 38" fill="url(#hair)" />
      {/* Pink tip right */}
      <path d="M80 50 Q82 56 78 58" stroke="url(#pink)" stroke-width="4" stroke-linecap="round" fill="none" />

      {/* Bangs */}
      <path
        d="M28 26 Q32 36 35 40 Q38 32 40 26 Q43 34 46 38 Q49 28 52 24 Q55 32 58 36 Q62 28 65 26 Q68 34 72 40"
        fill="url(#hair)"
      />
      {/* Pink streaks */}
      <path d="M28 26 Q30 32 33 38" stroke="#f472b6" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8" />
      <path d="M68 28 Q70 34 72 40" stroke="#f472b6" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8" />

      {/* Eyes */}
      <g filter={props.isThinking ? "url(#glow)" : undefined}>
        {/* Left eye */}
        <ellipse
          cx="38"
          cy={48 + eyeY()}
          rx="5"
          ry={eyeHeight()}
          fill="white"
          style={{ transition: "ry 0.1s ease" }}
        />
        <ellipse
          cx="39"
          cy={49 + eyeY()}
          rx="2.5"
          ry={blinkClosed() ? 0 : 3}
          fill="#1c1c1e"
        />
        <circle cx="40" cy={47 + eyeY()} r="1" fill="white" opacity={blinkClosed() ? 0 : 1} />

        {/* Right eye */}
        <ellipse
          cx="62"
          cy={48 + eyeY()}
          rx="5"
          ry={eyeHeight()}
          fill="white"
          style={{ transition: "ry 0.1s ease" }}
        />
        <ellipse
          cx="61"
          cy={49 + eyeY()}
          rx="2.5"
          ry={blinkClosed() ? 0 : 3}
          fill="#1c1c1e"
        />
        <circle cx="62" cy={47 + eyeY()} r="1" fill="white" opacity={blinkClosed() ? 0 : 1} />
      </g>

      {/* Eyebrows */}
      <path d="M31 38 Q38 34 45 38" stroke="#1c1c1e" stroke-width="1.5" stroke-linecap="round" fill="none" />
      <path d="M55 39 Q62 36 69 39" stroke="#1c1c1e" stroke-width="1.5" stroke-linecap="round" fill="none" />

      {/* Nose */}
      <path d="M50 50 Q51 55 50 58" stroke="#c9a080" stroke-width="1" stroke-linecap="round" fill="none" />

      {/* Mouth */}
      <path
        d={props.isThinking ? "M44 64 Q50 66 56 63" : "M44 63 Q50 66 56 63"}
        stroke="#b08968"
        stroke-width="1.5"
        stroke-linecap="round"
        fill="none"
      />

      {/* Earrings */}
      <circle cx="22" cy="48" r="2" fill="#fcd34d" />
      <circle cx="78" cy="48" r="2" fill="#fcd34d" />

      {/* Hoodie strings */}
      <line x1="42" y1="84" x2="40" y2="100" stroke="#6d28d9" stroke-width="1" opacity="0.6" />
      <line x1="58" y1="84" x2="60" y2="100" stroke="#6d28d9" stroke-width="1" opacity="0.6" />
    </svg>
  );
}
