import React from 'react';

interface RoosterLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RoosterLogo: React.FC<RoosterLogoProps> = ({ size = 80, className, style }) => {
  const aspectH = (size * 230) / 200;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 230"
      width={size}
      height={aspectH}
      fill="none"
      className={className}
      style={style}
      aria-label="SGTG Logo — Gallo con guantes de boxeo"
      role="img"
    >
      <defs>
        <linearGradient id="gBody" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#F7CB45" />
          <stop offset="50%" stopColor="#D4920C" />
          <stop offset="100%" stopColor="#8B5200" />
        </linearGradient>
        <linearGradient id="gHead" x1="25%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#F5C838" />
          <stop offset="100%" stopColor="#C4820A" />
        </linearGradient>
        <linearGradient id="gGloveL" x1="20%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#FF5C5C" />
          <stop offset="100%" stopColor="#8B0000" />
        </linearGradient>
        <linearGradient id="gGloveR" x1="80%" y1="10%" x2="10%" y2="90%">
          <stop offset="0%" stopColor="#FF5C5C" />
          <stop offset="100%" stopColor="#8B0000" />
        </linearGradient>
        <linearGradient id="gComb" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF5555" />
          <stop offset="100%" stopColor="#BB0000" />
        </linearGradient>
        <linearGradient id="gTailA" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5C3300" />
          <stop offset="100%" stopColor="#F0BE28" />
        </linearGradient>
        <linearGradient id="gTailB" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7A4500" />
          <stop offset="100%" stopColor="#F8D050" />
        </linearGradient>
        <linearGradient id="gTailC" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6B3D00" />
          <stop offset="100%" stopColor="#E8B020" />
        </linearGradient>
        <linearGradient id="gWing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DCA020" />
          <stop offset="100%" stopColor="#A06C00" />
        </linearGradient>
        <filter id="rShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000066" />
        </filter>
      </defs>

      <path d="M 78 147 C 62 138 40 118 14 74 C 21 68 30 72 32 78 C 48 115 65 138 84 152 Z"
        fill="url(#gTailA)" stroke="#5C3300" strokeWidth="1" />
      <path d="M 80 140 C 60 118 46 84 36 46 C 44 43 52 48 52 55 C 58 88 70 124 86 145 Z"
        fill="url(#gTailB)" stroke="#7A4500" strokeWidth="1" />
      <path d="M 84 133 C 68 108 66 72 76 38 C 86 37 92 44 90 50 C 78 80 78 118 90 137 Z"
        fill="url(#gTailB)" stroke="#7A4500" strokeWidth="1" />
      <path d="M 89 130 C 82 103 89 68 104 40 C 114 41 116 48 112 54 C 98 80 93 116 94 134 Z"
        fill="url(#gTailC)" stroke="#7A4500" strokeWidth="1" />
      <path d="M 94 132 C 96 106 108 75 125 52 C 133 55 133 63 129 68 C 114 90 103 118 97 136 Z"
        fill="url(#gTailA)" stroke="#5C3300" strokeWidth="1" />

      <ellipse cx="106" cy="156" rx="46" ry="41"
        fill="url(#gBody)" stroke="#7A4500" strokeWidth="2" filter="url(#rShadow)" />

      {[
        "M 78 133 Q 85 127 92 133", "M 93 130 Q 100 124 107 130", "M 108 130 Q 115 124 122 130", "M 124 134 Q 131 128 138 134",
        "M 74 147 Q 81 141 88 147", "M 89 144 Q 96 138 103 144", "M 104 143 Q 111 137 118 143", "M 119 146 Q 126 140 133 146",
        "M 76 160 Q 83 154 90 160", "M 91 157 Q 98 151 105 157", "M 106 157 Q 113 151 120 157", "M 121 160 Q 128 154 135 160",
      ].map((d, i) => (
        <path key={i} d={d} stroke="#F5CC30" strokeWidth="1.3" fill="none" opacity="0.6" />
      ))}

      <path d="M 64 150 C 50 152 34 162 16 176 C 12 171 11 165 16 160 C 32 148 52 140 68 141 Z"
        fill="url(#gWing)" stroke="#7A4500" strokeWidth="1.5" />
      <path d="M 148 150 C 162 152 178 162 196 176 C 200 171 201 165 196 160 C 180 148 160 140 144 141 Z"
        fill="url(#gWing)" stroke="#7A4500" strokeWidth="1.5" />

      <rect x="3" y="168" width="29" height="15" rx="5"
        fill="#CC1111" stroke="#880000" strokeWidth="1.5" />
      <line x1="3" y1="175" x2="32" y2="175" stroke="#AA0000" strokeWidth="1.5" />
      <line x1="3" y1="179" x2="32" y2="179" stroke="#FF6666" strokeWidth="0.7" opacity="0.4" />
      <ellipse cx="17" cy="154" rx="17" ry="15"
        fill="url(#gGloveL)" stroke="#880000" strokeWidth="1.5" filter="url(#rShadow)" />
      <path d="M 30 148 C 40 144 45 150 43 157 C 41 163 35 164 31 159 Z"
        fill="#EE2222" stroke="#880000" strokeWidth="1" />
      <path d="M 10 145 C 11 154 10 163" stroke="#AA0000" strokeWidth="1" fill="none" />
      <path d="M 16 143 C 17 153 16 163" stroke="#AA0000" strokeWidth="1" fill="none" />
      <path d="M 22 143 C 23 153 22 163" stroke="#AA0000" strokeWidth="1" fill="none" />
      <ellipse cx="10" cy="147" rx="5" ry="4" fill="white" opacity="0.25" transform="rotate(-20,10,147)" />

      <rect x="168" y="168" width="29" height="15" rx="5"
        fill="#CC1111" stroke="#880000" strokeWidth="1.5" />
      <line x1="168" y1="175" x2="197" y2="175" stroke="#AA0000" strokeWidth="1.5" />
      <line x1="168" y1="179" x2="197" y2="179" stroke="#FF6666" strokeWidth="0.7" opacity="0.4" />
      <ellipse cx="183" cy="154" rx="17" ry="15"
        fill="url(#gGloveR)" stroke="#880000" strokeWidth="1.5" filter="url(#rShadow)" />
      <path d="M 170 148 C 160 144 155 150 157 157 C 159 163 165 164 169 159 Z"
        fill="#EE2222" stroke="#880000" strokeWidth="1" />
      <path d="M 190 145 C 189 154 190 163" stroke="#AA0000" strokeWidth="1" fill="none" />
      <path d="M 184 143 C 183 153 184 163" stroke="#AA0000" strokeWidth="1" fill="none" />
      <path d="M 178 143 C 177 153 178 163" stroke="#AA0000" strokeWidth="1" fill="none" />
      <ellipse cx="190" cy="147" rx="5" ry="4" fill="white" opacity="0.25" transform="rotate(20,190,147)" />

      <path d="M 88 116 C 82 107 82 96 86 88 C 92 83 110 83 116 88 C 120 96 120 107 114 116 C 106 122 96 122 88 116 Z"
        fill="url(#gHead)" stroke="#7A4500" strokeWidth="1.5" />
      <path d="M 86 98 Q 101 94 116 98" stroke="#C88010" strokeWidth="1" fill="none" opacity="0.55" />
      <path d="M 85 106 Q 101 102 117 106" stroke="#C88010" strokeWidth="1" fill="none" opacity="0.55" />
      <path d="M 86 113 Q 101 109 116 113" stroke="#C88010" strokeWidth="1" fill="none" opacity="0.55" />

      <ellipse cx="101" cy="74" rx="27" ry="25"
        fill="url(#gHead)" stroke="#7A4500" strokeWidth="2" filter="url(#rShadow)" />

      <path d="M 84 62 C 78 48 84 38 93 43 C 92 33 100 28 106 35 C 108 26 118 28 118 38 C 124 34 130 42 124 50 C 120 44 118 52 115 60 Z"
        fill="url(#gComb)" stroke="#880000" strokeWidth="1.5" />
      <path d="M 91 43 C 94 36 101 31 106 36" stroke="#FF8888" strokeWidth="1" fill="none" opacity="0.5" />

      <circle cx="114" cy="70" r="9" fill="white" stroke="#7A4500" strokeWidth="1.5" />
      <circle cx="116" cy="70" r="6" fill="#1A0A00" />
      <circle cx="117.5" cy="68" r="2.2" fill="white" />
      <circle cx="114" cy="72" r="1" fill="white" opacity="0.5" />

      <path d="M 126 72 L 146 77 L 126 83 Q 119 80 119 76 Q 119 72 126 72 Z"
        fill="#E8A020" stroke="#9A6010" strokeWidth="1.2" />
      <path d="M 126 83 L 142 86 L 126 90 Q 120 88 120 86 Q 120 84 126 83 Z"
        fill="#D49010" stroke="#9A6010" strokeWidth="1" />
      <ellipse cx="130" cy="76" rx="2" ry="1.2" fill="#9A6010" opacity="0.6" />

      <path d="M 128 90 C 137 96 138 110 130 118 C 122 124 114 118 115 108 C 116 98 122 90 128 90 Z"
        fill="#CC1111" stroke="#880000" strokeWidth="1.2" />
      <path d="M 126 94 C 133 98 134 108 128 115" stroke="#FF6666" strokeWidth="1" fill="none" opacity="0.4" />

      <path d="M 94 194 L 87 218" stroke="#C8820E" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 87 218 L 74 227" stroke="#C8820E" strokeWidth="3" strokeLinecap="round" />
      <path d="M 87 218 L 84 230" stroke="#C8820E" strokeWidth="3" strokeLinecap="round" />
      <path d="M 87 218 L 94 228" stroke="#C8820E" strokeWidth="3" strokeLinecap="round" />
      <path d="M 90 210 L 80 206" stroke="#A06010" strokeWidth="2.2" strokeLinecap="round" />

      <path d="M 116 194 L 123 218" stroke="#C8820E" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 123 218 L 136 227" stroke="#C8820E" strokeWidth="3" strokeLinecap="round" />
      <path d="M 123 218 L 126 230" stroke="#C8820E" strokeWidth="3" strokeLinecap="round" />
      <path d="M 123 218 L 116 228" stroke="#C8820E" strokeWidth="3" strokeLinecap="round" />
      <path d="M 120 210 L 130 206" stroke="#A06010" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export default RoosterLogo;