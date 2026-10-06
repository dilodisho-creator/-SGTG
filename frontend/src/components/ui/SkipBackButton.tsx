import { useLottieButton } from '../../hooks/useLottieButton';
import animationData from '../../assets/skipBack.json';

interface SkipBackButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  className?: string;
  size?: number;
  children?: React.ReactNode;
}

export function SkipBackButton({
  onClick,
  disabled = false,
  title,
  'aria-label': ariaLabel,
  className = 'p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
  size = 28,
  children,
}: SkipBackButtonProps) {
  const { containerRef, handleMouseEnter, handleMouseLeave } = useLottieButton({ animationData, size });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title ?? 'Reiniciar'}
      onMouseEnter={() => !disabled && handleMouseEnter()}
      onMouseLeave={handleMouseLeave}
      className={`${className} disabled:pointer-events-none disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-1`}
    >
      <div ref={containerRef} style={{ width: size, height: size, display: 'block', flexShrink: 0 }} aria-hidden />
      {children}
    </button>
  );
}