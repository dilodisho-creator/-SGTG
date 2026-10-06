import { useLottieButton } from '../../hooks/useLottieButton';
import leftData from '../../assets/chevronLeft.json';
import rightData from '../../assets/chevronRight.json';

interface ChevronButtonProps {
  onClick: () => void;
  disabled?: boolean;
  direction: 'left' | 'right';
  title?: string;
  'aria-label'?: string;
  className?: string;
  size?: number;
  children?: React.ReactNode;
}

export function ChevronButton({
  onClick,
  disabled = false,
  direction,
  title,
  'aria-label': ariaLabel,
  className = 'p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
  size = 28,
  children,
}: ChevronButtonProps) {
  const animData = direction === 'left' ? leftData : rightData;
  const { containerRef, handleMouseEnter, handleMouseLeave } = useLottieButton({ animationData: animData, size });

  const defaultLabel = direction === 'left' ? 'Anterior' : 'Siguiente';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? defaultLabel}
      aria-label={ariaLabel ?? title ?? defaultLabel}
      onMouseEnter={() => !disabled && handleMouseEnter()}
      onMouseLeave={handleMouseLeave}
      className={`${className} disabled:pointer-events-none disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-1`}
    >
      {direction === 'left' && <div ref={containerRef} style={{ width: size, height: size, display: 'block', flexShrink: 0 }} aria-hidden />}
      {children}
      {direction === 'right' && <div ref={containerRef} style={{ width: size, height: size, display: 'block', flexShrink: 0 }} aria-hidden />}
    </button>
  );
}