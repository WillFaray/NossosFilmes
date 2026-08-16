"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 animate-fadeIn bg-gray-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Conteúdo */}
            <div className="relative w-full max-w-lg animate-scaleIn overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 rounded-lg bg-gray-100/80 p-1.5 text-gray-500 backdrop-blur transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    aria-label="Fechar modal"
                >
                    <X size={16} />
                </button>
                {children}
            </div>
        </div>
    );
}