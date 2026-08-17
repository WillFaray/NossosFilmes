"use client";

import { Menu } from "lucide-react";

interface HeaderMobileProps {
    onOpenSidebar: () => void;
}

export function HeaderMobile({ onOpenSidebar }: HeaderMobileProps) {
    return (
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200/60 bg-white/70 px-4 backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-gray-950/50">
            <button
                onClick={onOpenSidebar}
                className="rounded-lg p-2 text-gray-600 hover:bg-white/10 dark:text-gray-300 dark:hover:text-white"
                aria-label="Abrir menu"
            >
                <Menu size={20} />
            </button>
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                Nossos<span className="text-gold-gradient">Filmes</span>
            </span>
        </header>
    );
}