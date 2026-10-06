import { useLottieButton } from '../../hooks/useLottieButton';
import animationData from '../../assets/trashV2.json';

interface TrashButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  className?: string;
  size?: number;
}

export function TrashButton({
  onClick,
  disabled = false,
  title,
  'aria-label': ariaLabel,
  className = 'p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10',
  size = 28,
}: TrashButtonProps) {
  const { containerRef, handleMouseEnter, handleMouseLeave } = useLottieButton({ animationData, size });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title ?? 'Eliminar'}
      onMouseEnter={() => !disabled && handleMouseEnter()}
      onMouseLeave={handleMouseLeave}
      className={`${className} disabled:pointer-events-none disabled:opacity-40 transition-colors inline-flex items-center justify-center`}
    >
      <div ref={containerRef} style={{ width: size, height: size, display: 'block', flexShrink: 0 }} aria-hidden />
    </button>
  );
}