import { create } from 'zustand';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }
interface ToastStore { toasts: Toast[]; push: (message: string, type?: Toast['type']) => void; remove: (id: number) => void }

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push(message, type = 'info') {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  remove(id) { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); }
}));

export function ToastHost() {
  const { toasts, remove } = useToast();
  return <div className="toast-host">{toasts.map((toast) => <button key={toast.id} className={`toast ${toast.type}`} onClick={() => remove(toast.id)}>{toast.message}</button>)}</div>;
}
