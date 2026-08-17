"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
                    {/* Overlay com blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="absolute inset-0 bg-gray-950/70 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Conteúdo: fade + scale do centro */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl dark:bg-white/[0.06]"
                    >
                        <button
                            onClick={onClose}
                            className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/20 p-1.5 text-gray-500 backdrop-blur-md transition-all hover:scale-110 hover:bg-black/30 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                            aria-label="Fechar modal"
                        >
                            <X size={16} />
                        </button>
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}