"use client";

import { Menu } from "lucide-react";

interface HeaderMobileProps {
    onOpenSidebar: () => void;
}

export function HeaderMobile({ onOpenSidebar }: HeaderMobileProps) {
    return (
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur lg:hidden dark:border-gray-800 dark:bg-surface-dark/80">
            <button
                onClick={onOpenSidebar}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Abrir menu"
            >
                <Menu size={20} />
            </button>
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                Nossos<span className="text-indigo-500">Filmes</span>
            </span>
        </header>
    );
}