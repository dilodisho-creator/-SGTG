import type { AbsorbPhase } from '../../hooks/useAbsorbDelete';

interface Props {
  phase: AbsorbPhase;
  lidOpen: boolean;
}

export function TrashCanSVG({ phase, lidOpen }: Props) {
  const isRed = phase !== 'idle';
  const open = lidOpen || phase === 'opening' || phase === 'absorbing';

  const color = isRed ? '#ef4444' : 'currentColor';
  const glow = isRed ? 'drop-shadow(0 0 5px rgba(239,68,68,.7))' : 'none';
  const trans = 'stroke 160ms ease, filter 160ms ease';

  const lidTransition = open
    ? 'transform 260ms cubic-bezier(.2,0,.3,1)'
    : 'transform 220ms cubic-bezier(.34,1.56,.64,1)';

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <g stroke={color} style={{ transition: trans, filter: glow }}>
        <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </g>

      <g
        stroke={color}
        style={{
          transition: [trans, lidTransition].join(', '),
          filter: glow,
          transform: open
            ? 'translate(21px,6px) rotate(-38deg) translate(-21px,-6px)'
            : 'translate(21px,6px) rotate(0deg) translate(-21px,-6px)',
        }}
      >
        <line x1="3" y1="6" x2="21" y2="6" />
      </g>
    </svg>
  );
}