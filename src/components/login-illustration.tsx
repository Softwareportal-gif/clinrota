// Original illustration for the login page's brand panel — a supervisor
// (white coat, stethoscope) reviewing a student's (coral scrubs) tablet,
// which shows a checkmark badge. Depicts ClinRota's actual supervisor-
// review workflow rather than a generic stock scene. Not a copy of any
// third-party illustration; built from scratch for this component.
export function LoginIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="335" cy="150" r="180" fill="#0E6F63" opacity="0.14" />
      <circle cx="80" cy="390" r="95" fill="#E8734A" opacity="0.12" />
      <ellipse cx="245" cy="452" rx="150" ry="16" fill="#0A3F38" opacity="0.08" />
      <g>
        <rect x="140" y="330" width="30" height="110" rx="12" fill="#0E6F63" />
        <rect x="182" y="330" width="30" height="110" rx="12" fill="#0E6F63" />
        <path
          d="M120 200 Q120 178 145 178 L207 178 Q232 178 232 200 L238 350 Q238 372 214 372 L138 372 Q114 372 114 350 Z"
          fill="#FFFFFF"
          stroke="#0A3F38"
          strokeWidth="3.5"
        />
        <path d="M162 182 L190 182 L184 206 L168 206 Z" fill="#0E6F63" />
        <path
          d="M158 190 Q152 220 168 236 Q184 252 184 236"
          fill="none"
          stroke="#E8734A"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="184" cy="238" r="6" fill="#E8734A" />
        <path d="M120 210 Q104 240 112 278" fill="none" stroke="#FFFFFF" strokeWidth="26" strokeLinecap="round" />
        <path d="M120 210 Q104 240 112 278" fill="none" stroke="#0A3F38" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M232 210 Q246 236 236 262" fill="none" stroke="#FFFFFF" strokeWidth="26" strokeLinecap="round" />
        <path d="M232 210 Q246 236 236 262" fill="none" stroke="#0A3F38" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="176" cy="150" r="34" fill="#8B5E3C" />
        <path
          d="M144 142 Q142 104 176 104 Q210 104 208 142 Q198 122 176 122 Q154 122 144 142 Z"
          fill="#0A3F38"
        />
      </g>
      <g>
        <rect x="262" y="360" width="32" height="100" rx="13" fill="#0A3F38" />
        <rect x="306" y="360" width="32" height="100" rx="13" fill="#0A3F38" />
        <path
          d="M250 232 Q250 208 278 208 L322 208 Q350 208 350 232 L354 372 Q354 396 328 396 L272 396 Q246 396 246 372 Z"
          fill="#E8734A"
        />
        <path d="M290 212 L312 212 L305 232 L297 232 Z" fill="#0A3F38" />
        <path d="M354 246 Q378 262 368 292" fill="none" stroke="#E8734A" strokeWidth="27" strokeLinecap="round" />
        <circle cx="300" cy="178" r="36" fill="#A9754C" />
        <path
          d="M264 176 Q258 128 300 126 Q342 128 336 176 Q338 148 316 138 Q322 156 300 156 Q278 156 284 138 Q262 148 264 176 Z"
          fill="#0A3F38"
        />
        <path d="M250 246 Q228 264 244 292" fill="none" stroke="#E8734A" strokeWidth="27" strokeLinecap="round" />
        <g transform="rotate(-18 236 300)">
          <rect x="198" y="266" width="66" height="84" rx="10" fill="#0A3F38" />
          <path d="M198 266 L224 266 L198 292 Z" fill="#E8734A" />
        </g>
        <g transform="rotate(4 300 316)">
          <rect x="264" y="266" width="74" height="98" rx="10" fill="#FFFFFF" stroke="#0A3F38" strokeWidth="3" />
          <rect x="276" y="282" width="50" height="6" rx="3" fill="#CBD8D4" />
          <rect x="276" y="296" width="50" height="6" rx="3" fill="#CBD8D4" />
          <rect x="276" y="310" width="34" height="6" rx="3" fill="#CBD8D4" />
          <circle cx="316" cy="342" r="12" fill="#E8734A" />
          <path
            d="M310 342 L314 347 L322 336"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
