import { useRef, useState, useCallback } from 'react';

export type AbsorbPhase = 'idle' | 'opening' | 'absorbing' | 'closing' | 'collapsing';

const T_OPEN = 300;
const T_FLY = 650;
const T_STAGGER = 380;
const T_CLOSE = 260;
const T_COLLAPSE = 340;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface Options {
  onDelete: () => Promise<void>;
  onError?: (err: unknown) => void;
  trashRef: React.RefObject<HTMLButtonElement | null>;
  rowRef: React.RefObject<HTMLDivElement | null>;
  pieceRefs: React.RefObject<(HTMLElement | null)[]>;
}

export function useAbsorbDelete({ onDelete, onError, trashRef, rowRef, pieceRefs }: Options) {
  const [phase, setPhase] = useState<AbsorbPhase>('idle');
  const busy = useRef(false);

  const trigger = useCallback(async () => {
    if (busy.current) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try { await onDelete(); } catch (e) { onError?.(e); }
      return;
    }

    const row = rowRef.current;
    const trash = trashRef.current;
    if (!row || !trash) return;

    busy.current = true;
    row.style.pointerEvents = 'none';

    setPhase('opening');
    await sleep(T_OPEN);

    setPhase('absorbing');

    const trashRect = trash.getBoundingClientRect();
    const mouth = {
      x: trashRect.left + trashRect.width / 2,
      y: trashRect.top + trashRect.height * 0.3,
    };

    const pieces = (pieceRefs.current ?? []).filter(Boolean) as HTMLElement[];

    const distances = pieces.map((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return Math.hypot(cx - mouth.x, cy - mouth.y);
    });
    const maxDist = Math.max(...distances, 1);

    const cloneEls: HTMLElement[] = [];
    const flyPromises = pieces.map((el, i) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mouth.x - cx;
      const dy = mouth.y - cy;
      const spin = rnd(-320, 320);
      const lag = (distances[i] / maxDist) * T_STAGGER;

      const clone = el.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, {
        position: 'fixed',
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: '99999',
        boxSizing: 'border-box',
      });
      document.body.appendChild(clone);
      cloneEls.push(clone);

      el.style.opacity = '0';

      return clone.animate(
        [
          { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: '1', offset: 0 },
          { transform: `translate(${-dx * .06}px,${-dy * .06}px) scale(1.12) rotate(${spin * .04}deg)`, opacity: '1', offset: 0.14 },
          { transform: `translate(${dx}px,${dy}px) scale(0.04) rotate(${spin}deg)`, opacity: '0', offset: 1 },
        ],
        { duration: T_FLY, delay: lag, easing: 'cubic-bezier(.25,0,.75,.6)', fill: 'both' }
      ).finished.then(() => {
        clone.remove();
        el.style.opacity = '1';
      });
    });

    trash.animate(
      [
        { transform: 'scale(1,1)', offset: 0 },
        { transform: 'scale(1.2,.8)', offset: .25 },
        { transform: 'scale(.9,1.1)', offset: .55 },
        { transform: 'scale(1.04,.97)', offset: .75 },
        { transform: 'scale(1,1)', offset: 1 },
      ],
      { duration: T_FLY * .7, delay: T_STAGGER * .3, easing: 'ease-in-out' }
    );

    await Promise.all(flyPromises);
    cloneEls.forEach((c) => c.remove());

    setPhase('closing');
    await sleep(T_CLOSE);

    setPhase('collapsing');
    const s = window.getComputedStyle(row);
    await row.animate(
      [
        { height: s.height, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, opacity: '1', overflow: 'hidden' },
        { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: '0', overflow: 'hidden' },
      ],
      { duration: T_COLLAPSE, easing: 'ease-in', fill: 'both' }
    ).finished;

    try {
      await onDelete();
    } catch (err) {
      row.getAnimations().forEach((a) => a.cancel());
      pieces.forEach((el) => { el.style.opacity = '1'; });
      row.style.removeProperty('pointer-events');
      setPhase('idle');
      onError?.(err);
    } finally {
      busy.current = false;
    }
  }, [onDelete, onError, trashRef, rowRef, pieceRefs]);

  return { phase, trigger };
}