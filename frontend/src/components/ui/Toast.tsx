import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { removeToast, selectToasts } from "../../store/slices/toastSlice";
import type { ToastType } from "../../store/slices/toastSlice";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";

// ── Config per type ───────────────────────────────────────────
const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ReactNode; bg: string; border: string; text: string }
> = {
  success: {
    icon: <CheckCircle2 size={17} />,
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.35)",
    text: "#86efac",
  },
  error: {
    icon: <XCircle size={17} />,
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.35)",
    text: "#fca5a5",
  },
  warning: {
    icon: <AlertTriangle size={17} />,
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.35)",
    text: "#fde047",
  },
  info: {
    icon: <Info size={17} />,
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.35)",
    text: "#c4b5fd",
  },
  loading: {
    icon: <Loader2 size={17} className="animate-spin" />,
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.35)",
    text: "#94a3b8",
  },
};

// ── Single toast item ─────────────────────────────────────────
function ToastItem({
  id,
  type,
  message,
  duration,
}: {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}) {
  const dispatch = useAppDispatch();
  const cfg = TOAST_CONFIG[type];

  const dismiss = () => dispatch(removeToast(id));

  // Auto-dismiss
  useEffect(() => {
    if (duration === 0) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [id, duration]);

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm max-w-sm w-full
                 animate-[slideIn_0.2s_ease-out]"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: cfg.text }}>
        {cfg.icon}
      </span>
      <span className="flex-1 text-white/80 leading-snug">{message}</span>
      {type !== "loading" && (
        <button
          onClick={dismiss}
          className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ── Toast container — mount once inside App ───────────────────
export default function ToastContainer() {
  const toasts = useAppSelector(selectToasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
}