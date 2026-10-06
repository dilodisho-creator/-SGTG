import { useCallback, useRef, useState } from 'react';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast(duration = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastState['type'] = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    if (duration > 0) {
      timerRef.current = setTimeout(() => setToast(null), duration);
    }
  }, [duration]);

  const close = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const success = useCallback((message: string) => show(message, 'success'), [show]);
  const error = useCallback((message: string) => show(message, 'error'), [show]);
  const info = useCallback((message: string) => show(message, 'info'), [show]);

  return { toast, close, success, error, info };
}