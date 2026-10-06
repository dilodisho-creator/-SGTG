import React, { useState } from 'react';
import { motion } from 'motion/react';

interface DownloadButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  'aria-label'?: string;
  className?: string;
  size?: number;
  children?: React.ReactNode;
}

export function DownloadButton({
  onClick,
  disabled = false,
  loading = false,
  title,
  'aria-label': ariaLabel,
  className = 'p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10',
  size = 20,
  children,
}: DownloadButtonProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
    }, 650);
    onClick(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel ?? title ?? 'Descargar'}
      className={`${className} disabled:pointer-events-none disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2`}
    >
      {!loading && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
          aria-hidden
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />

          <motion.g
            animate={
              animating
                ? {
                  y: [0, 4, 10, -6, 0],
                  opacity: [1, 1, 0, 0, 1],
                  transition: {
                    duration: 0.6,
                    times: [0, 0.35, 0.52, 0.55, 1],
                    ease: 'easeInOut',
                  },
                }
                : { y: 0, opacity: 1 }
            }
          >
            <line x1="12" y1="3" x2="12" y2="15" />
            <polyline points="7 10 12 15 17 10" />
          </motion.g>
        </svg>
      )}
      {children}
    </button>
  );
}