import { createSignal, createEffect, onCleanup } from "solid-js";

interface KiraProps {
  isThinking: boolean;
}

export function Kira(props: KiraProps) {
  const [eyeOffset, setEyeOffset] = createSignal(0);

  createEffect(() => {
    if (props.isThinking) {
      let direction = 1;
      let position = 0;
      const interval = setInterval(() => {
        position += direction * 0.3;
        if (position >= 2.5) direction = -1;
        if (position <= -2.5) direction = 1;
        setEyeOffset(position);
      }, 40);
      onCleanup(() => clearInterval(interval));
    } else {
      setEyeOffset(0);
    }
  });

  return (
    <svg
      width="160"
      height="200"
      viewBox="0 0 160 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="kira-character"
    >
      <defs>
        <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#d4a574" />
          <stop offset="100%" stop-color="#c4956a" />
        </linearGradient>
        <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1a1a1a" />
          <stop offset="100%" stop-color="#2d2d2d" />
        </linearGradient>
        <linearGradient id="hoodieGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3d2a6e" />
          <stop offset="100%" stop-color="#2a1d4d" />
        </linearGradient>
        <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b9d" />
          <stop offset="100%" stop-color="#c44569" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>

      {/* Hoodie Body */}
      <g filter="url(#softShadow)">
        <path
          d="M35 200 L42 135 Q80 118 118 135 L125 200"
          fill="url(#hoodieGradient)"
        />
        {/* Hoodie neckline */}
        <ellipse cx="80" cy="132" rx="28" ry="10" fill="#2a1d4d" />
      </g>

      {/* Neck */}
      <rect x="70" y="108" width="20" height="26" rx="4" fill="url(#skinGradient)" />

      {/* Face */}
      <ellipse cx="80" cy="70" rx="44" ry="48" fill="url(#skinGradient)" />

      {/* Hair base */}
      <path
        d="M36 62 Q36 18 80 12 Q124 18 124 62 Q124 38 110 30 Q80 18 50 30 Q36 38 36 62"
        fill="url(#hairGradient)"
      />

      {/* Left hair - longer side tucked */}
      <path
        d="M36 62 Q32 78 36 98 Q40 102 44 94 Q40 78 44 62"
        fill="url(#hairGradient)"
      />

      {/* Right hair - shorter asymmetric */}
      <path
        d="M124 62 Q128 72 126 82 Q123 86 120 78 Q122 70 120 62"
        fill="url(#hairGradient)"
      />

      {/* Pink tips - left */}
      <path
        d="M36 94 Q33 102 38 108"
        stroke="url(#pinkGradient)"
        stroke-width="6"
        stroke-linecap="round"
        fill="none"
      />

      {/* Pink tips - right */}
      <path
        d="M126 78 Q128 86 124 90"
        stroke="url(#pinkGradient)"
        stroke-width="6"
        stroke-linecap="round"
        fill="none"
      />

      {/* Bangs */}
      <path
        d="M44 42 Q50 56 54 62 Q58 50 62 42 Q66 54 70 60 Q74 46 78 40 Q82 52 86 58 Q90 44 94 40 Q98 52 102 58 Q106 46 112 42 Q116 54 120 62"
        fill="url(#hairGradient)"
      />

      {/* Pink streaks in bangs */}
      <path d="M44 42 Q47 50 50 56" stroke="#ff6b9d" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
      <path d="M112 42 Q115 50 118 56" stroke="#ff6b9d" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>

      {/* Eyes */}
      <g>
        {/* Left eye */}
        <ellipse
          cx="62"
          cy={78 + eyeOffset()}
          rx="8"
          ry="9"
          fill="white"
        />
        <ellipse
          cx="64"
          cy={80 + eyeOffset()}
          rx="4"
          ry="5"
          fill="#1a1a1a"
        />
        <circle cx="66" cy={78 + eyeOffset()} r="1.5" fill="white" />

        {/* Right eye */}
        <ellipse
          cx="98"
          cy={78 + eyeOffset()}
          rx="8"
          ry="8"
          fill="white"
        />
        <ellipse
          cx="96"
          cy={80 + eyeOffset()}
          rx="4"
          ry="5"
          fill="#1a1a1a"
        />
        <circle cx="98" cy={78 + eyeOffset()} r="1.5" fill="white" />
      </g>

      {/* Eyebrows */}
      <path
        d="M50 60 Q62 54 74 60"
        stroke="#1a1a1a"
        stroke-width="2.5"
        stroke-linecap="round"
        fill="none"
      />
      <path
        d="M86 62 Q98 58 110 62"
        stroke="#1a1a1a"
        stroke-width="2.5"
        stroke-linecap="round"
        fill="none"
      />

      {/* Nose */}
      <path
        d="M80 82 Q82 90 80 94"
        stroke="#b8956a"
        stroke-width="1.5"
        stroke-linecap="round"
        fill="none"
      />

      {/* Mouth - slight smirk */}
      <path
        d="M70 104 Q80 107 90 103"
        stroke="#9b7456"
        stroke-width="2"
        stroke-linecap="round"
        fill="none"
      />

      {/* Earrings */}
      <circle cx="36" cy="78" r="3" fill="#ffd700" />
      <circle cx="36" cy="78" r="1.5" fill="none" stroke="#daa520" stroke-width="1" />
      <circle cx="124" cy="78" r="3" fill="#ffd700" />
      <circle cx="124" cy="78" r="1.5" fill="none" stroke="#daa520" stroke-width="1" />

      {/* Hoodie strings */}
      <line x1="68" y1="138" x2="64" y2="160" stroke="#4a3875" stroke-width="1.5" opacity="0.7" />
      <line x1="92" y1="138" x2="96" y2="160" stroke="#4a3875" stroke-width="1.5" opacity="0.7" />
    </svg>
  );
}
