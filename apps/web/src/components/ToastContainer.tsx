/**
 * ToastContainer — Global toast/notification renderer.
 *
 * Subscribes to the uiStore toast list and renders animated toasts
 * in the top-right corner. Each toast auto-dismisses after its
 * configured duration and can be closed manually.
 *
 * Design pattern: Presentational component — all state lives in
 * the uiStore (Zustand), this component is a pure renderer.
 */
import { useEffect, useState } from 'react';
import { useToasts, useToastActions } from '../stores/uiStore';
import type { Toast } from '../stores/uiStore';

// ─── Individual Toast Item ────────────────────────────────────────────────────

interface ToastItemProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

const ICONS: Record<Toast['type'], string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

const COLORS: Record<Toast['type'], { bar: string; icon: string; bg: string; border: string }> = {
    success: {
        bar: 'bg-emerald-500',
        icon: 'text-emerald-500',
        bg: 'bg-white',
        border: 'border-emerald-200',
    },
    error: {
        bar: 'bg-red-500',
        icon: 'text-red-500',
        bg: 'bg-white',
        border: 'border-red-200',
    },
    warning: {
        bar: 'bg-amber-500',
        icon: 'text-amber-500',
        bg: 'bg-white',
        border: 'border-amber-200',
    },
    info: {
        bar: 'bg-blue-500',
        icon: 'text-blue-500',
        bg: 'bg-white',
        border: 'border-blue-200',
    },
};

const ToastItem = ({ toast, onDismiss }: ToastItemProps) => {
    const [visible, setVisible] = useState(false);

    // Trigger entrance animation on mount
    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const colors = COLORS[toast.type];

    const handleDismiss = () => {
        setVisible(false);
        // Wait for exit animation before removing from store
        setTimeout(() => onDismiss(toast.id), 300);
    };

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={`
        relative flex items-start gap-3 w-full max-w-sm
        ${colors.bg} ${colors.border}
        border rounded-xl shadow-lg overflow-hidden
        transition-all duration-300 ease-out
        ${visible
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-8'
                }
      `}
            style={{ pointerEvents: 'auto' }}
        >
            {/* Accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bar} rounded-l-xl`} />

            {/* Content */}
            <div className="flex items-start gap-3 p-4 pl-5 w-full">
                {/* Icon */}
                <span className={`material-symbols-outlined text-xl mt-0.5 flex-shrink-0 ${colors.icon}`}>
                    {ICONS[toast.type]}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{toast.title}</p>
                    {toast.message && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
                    )}
                    {toast.action && (
                        <button
                            onClick={toast.action.onClick}
                            className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                {/* Close button */}
                {toast.dismissible !== false && (
                    <button
                        onClick={handleDismiss}
                        aria-label="Dismiss notification"
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                )}
            </div>

            {/* Progress bar (only when duration > 0) */}
            {toast.duration && toast.duration > 0 && (
                <div
                    className={`absolute bottom-0 left-1 right-0 h-0.5 ${colors.bar} opacity-30 origin-left`}
                    style={{
                        animation: `shrink ${toast.duration}ms linear forwards`,
                    }}
                />
            )}
        </div>
    );
};

// ─── Toast Container ──────────────────────────────────────────────────────────

/**
 * Mount once in App.tsx — renders all active toasts in a fixed portal-like
 * overlay in the top-right corner. Safe to render even when toasts list is empty.
 */
const ToastContainer = () => {
    const toasts = useToasts();
    const { removeToast } = useToastActions();

    return (
        <>
            {/* Keyframe injection */}
            <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

            <div
                aria-label="Notifications"
                className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
                style={{ width: '360px', pointerEvents: 'none' }}
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
        </>
    );
};

export default ToastContainer;
