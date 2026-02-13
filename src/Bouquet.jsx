import React, { useId } from 'react';

export const Bouquet = ({ className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const wrapGradientId = `wrap-${uid}`;
  const ribbonGradientId = `ribbon-${uid}`;
  const leafGradientId = `leaf-${uid}`;
  const stemGradientId = `stem-${uid}`;

  const flowers = [
    { id: 'f1', cx: 74, cy: 128, size: 30, petalA: '#ff4f84', petalB: '#ff9bbb', core: '#ffe08a' },
    { id: 'f2', cx: 110, cy: 98, size: 32, petalA: '#ff5ea6', petalB: '#ffc0d2', core: '#ffe5a3' },
    { id: 'f3', cx: 154, cy: 110, size: 34, petalA: '#ffa63d', petalB: '#ffd677', core: '#fff2b3' },
    { id: 'f4', cx: 198, cy: 94, size: 31, petalA: '#ff568f', petalB: '#ffb2cb', core: '#ffe69c' },
    { id: 'f5', cx: 232, cy: 118, size: 29, petalA: '#ff7a49', petalB: '#ffba85', core: '#ffefad' },
    { id: 'f6', cx: 260, cy: 136, size: 26, petalA: '#ff6f9d', petalB: '#ffc4d9', core: '#ffe8a8' },
  ];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 320"
      role="img"
      aria-label="Valentine bouquet"
      className={className}
    >
      <defs>
        <linearGradient id={wrapGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9efe7" />
          <stop offset="100%" stopColor="#e7c9b6" />
        </linearGradient>
        <linearGradient id={ribbonGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4f7a" />
          <stop offset="100%" stopColor="#d92f63" />
        </linearGradient>
        <linearGradient id={leafGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7ed17f" />
          <stop offset="100%" stopColor="#40914e" />
        </linearGradient>
        <linearGradient id={stemGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#66b96c" />
          <stop offset="100%" stopColor="#3f8448" />
        </linearGradient>
      </defs>

      <g strokeLinecap="round">
        <path d="M160 258 L78 140" stroke={`url(#${stemGradientId})`} strokeWidth="7" />
        <path d="M160 258 L112 110" stroke={`url(#${stemGradientId})`} strokeWidth="7" />
        <path d="M160 258 L154 126" stroke={`url(#${stemGradientId})`} strokeWidth="7" />
        <path d="M160 258 L198 106" stroke={`url(#${stemGradientId})`} strokeWidth="7" />
        <path d="M160 258 L232 130" stroke={`url(#${stemGradientId})`} strokeWidth="7" />
        <path d="M160 258 L260 146" stroke={`url(#${stemGradientId})`} strokeWidth="7" />
      </g>

      <path d="M102 162 C84 176 78 204 90 224 C114 208 126 184 114 160Z" fill={`url(#${leafGradientId})`} />
      <path d="M138 158 C118 172 110 198 120 220 C146 204 158 180 146 156Z" fill={`url(#${leafGradientId})`} />
      <path d="M184 166 C208 176 220 200 218 222 C194 210 180 188 184 166Z" fill={`url(#${leafGradientId})`} />
      <path d="M220 172 C244 182 258 204 254 226 C230 214 216 192 220 172Z" fill={`url(#${leafGradientId})`} />
      <path d="M156 178 C146 190 144 212 152 228 C168 214 174 194 168 176Z" fill="#73c978" />

      {flowers.map((flower) => (
        <g key={flower.id} transform={`translate(${flower.cx} ${flower.cy})`}>
          <circle r={flower.size * 1.05} fill={flower.petalA} opacity="0.18" />
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <ellipse
              key={`${flower.id}-outer-${deg}`}
              rx={flower.size}
              ry={flower.size * 0.56}
              transform={`rotate(${deg})`}
              fill={flower.petalA}
            />
          ))}
          {[15, 45, 75, 105, 135, 165].map((deg) => (
            <ellipse
              key={`${flower.id}-inner-${deg}`}
              rx={flower.size * 0.68}
              ry={flower.size * 0.4}
              transform={`rotate(${deg})`}
              fill={flower.petalB}
            />
          ))}
          <circle r={flower.size * 0.42} fill={flower.core} />
          <circle r={flower.size * 0.18} fill="#fff6ca" opacity="0.9" />
        </g>
      ))}

      <path
        d="M68 184 L252 184 L204 294 Q160 322 116 294 Z"
        fill={`url(#${wrapGradientId})`}
        stroke="#d7b7a4"
        strokeWidth="3"
      />
      <path d="M90 196 L230 196" stroke="#e4c8b6" strokeWidth="2.2" />
      <path d="M106 184 L194 300" stroke="#d3b29f" strokeWidth="2.2" opacity="0.8" />

      <path
        d="M122 236 C144 214 176 214 198 236 C176 262 144 262 122 236Z"
        fill={`url(#${ribbonGradientId})`}
      />
      <path d="M122 236 L104 268 C132 264 146 252 150 240" fill="#ff6f91" />
      <path d="M198 236 L216 268 C188 264 174 252 170 240" fill="#ff6f91" />
    </svg>
  );
};
