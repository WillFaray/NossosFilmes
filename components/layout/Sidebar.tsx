import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, History, ListPlus, Moon, PlusCircle, Sun, Users, X } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

const navItems = [
    { href: "/", label: "Histórico", icon: History },
    { href: "/lista-de-interesse", label: "Lista de Interesse", icon: ListPlus },
    { href: "/perfis", label: "Perfis", icon: Users }
];

const primaryActions = [
    { href: "/adicionar", label: "Adicionar Registro", icon: PlusCircle }
];

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    return (
        <>
            {/* Overlay no mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0 dark:border-gray-800 dark:bg-card-dark",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Cabeçalho da sidebar */}
                <div className="flex h-16 items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2" onClick={onClose}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                            <Clapperboard size={18} />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                            Nossos<span className="text-indigo-500">Filmes</span>
                        </span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label="Fechar menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navegação */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {primaryActions.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}

                    <div className="pt-3">
                        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Navegação
                        </p>
                    </div>

                    {navItems.map((item) => {
                        const isActive =
                            item.href === "/"
                                ? pathname === "/"
                                : pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                                )}
                            >
                                <Icon size={18} className={cn(isActive ? "text-indigo-500" : "text-gray-400 dark:text-gray-500")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Rodapé com toggle de tema */}
                <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                    <button
                        onClick={toggleTheme}
                        className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        <span className="flex items-center gap-3">
                            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                            {theme === "dark" ? "Modo claro" : "Modo escuro"}
                        </span>
                        <span className="relative">
                            <span className="block h-5 w-9 rounded-full bg-gray-300 transition-colors dark:bg-indigo-500" />
                            <span className={cn(
                                "absolute top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform",
                                theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                            )} />
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
}