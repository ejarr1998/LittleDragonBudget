/**
 * The Little Dragon logo with a small animated flame at its mouth.
 * Fire is drawn in SVG + CSS keyframes — no video/GIF, stays sharp at any size.
 */
export function DragonFlame({ size = 40, className = '' }: { size?: number; className?: string }) {
  const flame = size * 0.34
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Little Dragon"
      role="img"
    >
      <img src="./dragon.png" alt="" className="w-full h-full object-contain" draggable={false} />
      {/* flame sits just off the mouth */}
      <svg
        viewBox="0 0 24 24"
        className="absolute dragon-flame"
        style={{
          width: flame,
          height: flame,
          left: size * 0.30,
          top: size * 0.36,
          transformOrigin: '50% 100%',
          filter: 'drop-shadow(0 0 3px rgba(255,140,66,0.55))',
        }}
      >
        {/* outer flame */}
        <path
          className="dragon-flame-outer"
          d="M12 23c-4.4 0-7.5-3-7.5-7 0-3.2 2-5.4 3.8-7.4C10 6.6 11 4.8 11 2c2.6 1.8 4 4.4 4.4 6.6.9-.5 1.6-1.2 2.1-2.2 1.4 1.8 2 4 2 6.1 0 5.5-3.1 10.5-7.5 10.5z"
          fill="#e86a2f"
        />
        {/* inner flame */}
        <path
          className="dragon-flame-inner"
          d="M12 22.4c-2.9 0-5-2.2-5-5 0-2.4 1.4-4 2.7-5.6 1.1-1.3 2-2.6 2.1-4.3 2.1 1.6 3.4 3.9 3.4 6.4 0 4.7-1.6 8.5-3.2 8.5z"
          fill="#f9c74f"
          style={{ transformOrigin: '50% 100%' }}
        />
        {/* core */}
        <ellipse className="dragon-flame-core" cx="12" cy="18.6" rx="2.1" ry="3.2" fill="#fdf0d5" style={{ transformOrigin: '50% 100%' }} />
      </svg>
    </span>
  )
}
