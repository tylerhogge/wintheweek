/**
 * Win The Week logo — envelope tray with checkmark.
 * A filled envelope pocket at the bottom with a clean bold
 * checkmark sitting above it. No outlines, just shapes.
 */
export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Green rounded square background */}
      <rect width="32" height="32" rx="7" fill="#22C55E" />

      {/* Envelope tray — filled pocket shape */}
      <path
        d="M6 16 L6 24 Q6 26 8 26 L24 26 Q26 26 26 24 L26 16 L16 22 Z"
        fill="black"
        fillOpacity="0.2"
      />

      {/* Bold checkmark */}
      <polyline
        points="10.5,13 14.5,17.5 22,8.5"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
