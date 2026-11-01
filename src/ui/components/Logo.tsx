/** The logo mark: a gold-field hex with a red 8 token (design: Logo Mark). Our own drawing. */
export function LogoMark({ size = 46, pips = false }: { size?: number; pips?: boolean }) {
  return (
    <svg
      width={(size * 40) / 46}
      height={size}
      viewBox="0 0 40 46"
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points="20,1 38.7,11.75 38.7,34.25 20,45 1.3,34.25 1.3,11.75"
        fill="#e8bb3f"
        stroke="#8a6a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="23" r="11" fill="#f8efd8" stroke="#8a6a1a" strokeWidth="1.5" />
      <text
        x="20"
        y={pips ? 26 : 28.2}
        textAnchor="middle"
        fontFamily="Spectral, Georgia, serif"
        fontWeight="800"
        fontSize="15"
        fill="#b8332a"
      >
        8
      </text>
      {pips
        ? [-4, -2, 0, 2, 4].map((dx) => (
            <circle key={dx} cx={20 + dx} cy="30" r="0.8" fill="#b8332a" />
          ))
        : null}
    </svg>
  )
}
