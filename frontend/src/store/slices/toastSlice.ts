import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms — 0 means never auto-dismiss
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = { toasts: [] };

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Omit<Toast, "id">>) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      state.toasts.push({ id, ...action.payload });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearAllToasts(state) {
      state.toasts = [];
    },
  },
});

export const { addToast, removeToast, clearAllToasts } = toastSlice.actions;
export default toastSlice.reducer;

// ── Selector ──────────────────────────────────────────────────
export const selectToasts = (state: { toast: ToastState }) => state.toast.toasts;

// ── Helper hook — call this in components ─────────────────────
// Usage:
//   const toast = useToast();
//   toast.success("Saved!");
//   toast.error("Something went wrong.");
import { useAppDispatch } from "../index";

export function useToast() {
  const dispatch = useAppDispatch();

  const show = (type: ToastType, message: string, duration = 4000) => {
    dispatch(addToast({ type, message, duration }));
  };

  return {
    success: (msg: string, duration?: number) => show("success", msg, duration),
    error:   (msg: string, duration?: number) => show("error", msg, duration),
    warning: (msg: string, duration?: number) => show("warning", msg, duration),
    info:    (msg: string, duration?: number) => show("info", msg, duration),
    loading: (msg: string) => show("loading", msg, 0), // never auto-dismiss
  };
}