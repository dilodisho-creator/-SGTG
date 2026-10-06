import { useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';

interface UseLottieButtonOptions {
  animationData: unknown;
  size?: number;
  autoplay?: boolean;
  loop?: boolean;
}

export function useLottieButton({
  animationData,
  size = 28,
  autoplay = false,
  loop = false,
}: UseLottieButtonOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay,
      animationData: animationData as object,
    });

    anim.addEventListener('DOMLoaded', () => {
      const svgEl = containerRef.current?.querySelector('svg');
      if (!svgEl) return;

      svgEl.style.width = `${size}px`;
      svgEl.style.height = `${size}px`;
      svgEl.setAttribute('width', String(size));
      svgEl.setAttribute('height', String(size));

      const uid = 'lottie-svg-' + Math.random().toString(36).slice(2, 9);
      svgEl.setAttribute('id', uid);

      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = [
        `#${uid} path, #${uid} polyline, #${uid} line, #${uid} rect, #${uid} circle, #${uid} ellipse {`,
        '  stroke: currentColor !important;',
        '  fill:   none         !important;',
        '}',
      ].join(' ');
      svgEl.insertBefore(styleEl, svgEl.firstChild);
    });

    animRef.current = anim;
    return () => anim.destroy();
  }, [size]);

  const handleMouseEnter = () => {
    const anim = animRef.current;
    if (!anim) return;
    anim.setDirection(1);
    anim.play();
  };

  const handleMouseLeave = () => {
    const anim = animRef.current;
    if (!anim) return;
    anim.setDirection(-1);
    anim.play();
  };

  return { containerRef, handleMouseEnter, handleMouseLeave };
}