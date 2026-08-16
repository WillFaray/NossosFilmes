"use client";

import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ToastProps {
    open: boolean;
    message: string;
    onClose: () => void;
}

export function Toast({ open, message, onClose }: ToastProps) {
    if (!open) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
            <div
                role="status"
                className={cn(
                    "pointer-events-auto flex items-center gap-3 rounded-full bg-gray-900 py-2 pl-3 pr-4 text-sm font-medium text-white shadow-lg ring-1 ring-black/10 animate-slideUp dark:bg-white dark:text-gray-900 dark:ring-white/10"
                )}
            >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 size={14} />
                </span>
                {message}
                <button
                    onClick={onClose}
                    className="rounded-full p-0.5 text-white/60 transition-colors hover:text-white dark:text-gray-400 dark:hover:text-gray-600"
                    aria-label="Fechar notificação"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}