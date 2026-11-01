import type { LucideProps } from 'lucide-react'

/** Our own lucide-style cactus (lucide has none): trunk, two arms and the ground. */
export const Cactus = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  ...rest
}: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="M10 21V6a2 2 0 0 1 4 0v15" />
    <path d="M14 13h2.5a2 2 0 0 0 2-2V8.5" />
    <path d="M10 15.5H7.5a2 2 0 0 1-2-2V11" />
    <path d="M5 21h14" />
  </svg>
)
