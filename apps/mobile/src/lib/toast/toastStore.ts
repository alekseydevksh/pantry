// One short message at a time, shown by `ToastHost`, for things that happened outside the screen the
// user is looking at (a queued cart change the server refused). A newer toast replaces the older.
import { createStore } from 'zustand/vanilla';

export type Toast = { id: number; message: string };

export type ToastState = {
  toast: Toast | null;
  show: (message: string) => void;
  dismiss: () => void;
};

let nextId = 0;

export const toastStore = createStore<ToastState>()((set) => ({
  toast: null,
  show: (message) => set({ toast: { id: ++nextId, message } }),
  dismiss: () => set({ toast: null }),
}));

export const showToast = (message: string) => toastStore.getState().show(message);
