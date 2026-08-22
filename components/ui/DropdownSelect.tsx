"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DropdownOption<T extends string | number> {
    value: T;
    label: string;
}

interface DropdownSelectProps<T extends string | number> {
    value: T;
    options: DropdownOption<T>[];
    onChange: (value: T) => void;
    ariaLabel?: string;
    className?: string;
}

export function DropdownSelect<T extends string | number>({
    value,
    options,
    onChange,
    ariaLabel,
    className
}: DropdownSelectProps<T>) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find((opt) => opt.value === value);

    // Fecha ao clicar fora
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    "inline-flex w-full items-center justify-between gap-2 rounded-lg border-0 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 transition-all",
                    "hover:ring-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    open
                        ? "ring-2 ring-indigo-500"
                        : "ring-gray-200 dark:ring-gray-700",
                    "dark:bg-card-dark dark:text-gray-200 dark:hover:ring-gray-600"
                )}
            >
                <span className="truncate">{selectedOption?.label ?? value}</span>
                <ChevronDown
                    size={14}
                    className={cn(
                        "shrink-0 text-gray-400 transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute left-0 z-30 mt-1.5 max-h-60 w-full min-w-[10rem] overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-lg shadow-gray-900/5 animate-slideUp dark:border-gray-800 dark:bg-card-dark dark:shadow-black/20"
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <li key={String(option.value)} role="option" aria-selected={isSelected}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                                        isSelected
                                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-white"
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && <Check size={13} className="shrink-0" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}