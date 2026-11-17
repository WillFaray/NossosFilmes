"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/utils";

interface WatchedDatesPickerProps {
    selectedDates: string[];
    onChange: (dates: string[]) => void;
    label?: string;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
];

function toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function WatchedDatesPicker({
    selectedDates,
    onChange,
    label = "Dias assistidos"
}: WatchedDatesPickerProps) {
    const today = useMemo(() => new Date(), []);
    const initialDate = useMemo(() => {
        if (selectedDates.length > 0) {
            const latest = [...selectedDates].sort().pop()!;
            const [y, m] = latest.split("-").map(Number);
            if (!isNaN(y) && !isNaN(m)) {
                return { year: y, month: m - 1 };
            }
        }
        return { year: today.getFullYear(), month: today.getMonth() };
    }, [selectedDates, today]);

    const [viewYear, setViewYear] = useState(initialDate.year);
    const [viewMonth, setViewMonth] = useState(initialDate.month);
    const [rangeStart, setRangeStart] = useState("");
    const [rangeEnd, setRangeEnd] = useState("");
    const [showRangeShortcut, setShowRangeShortcut] = useState(false);

    const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

    const calendarCells = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay = new Date(viewYear, viewMonth + 1, 0);
        const startOffset = firstDay.getDay();
        const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

        const cells: Array<{ date: Date; dateStr: string; inMonth: boolean }> = [];
        for (let i = 0; i < totalCells; i++) {
            const d = new Date(viewYear, viewMonth, i - startOffset + 1);
            cells.push({
                date: d,
                dateStr: toDateStr(d),
                inMonth: d.getMonth() === viewMonth
            });
        }
        return cells;
    }, [viewYear, viewMonth]);

    const toggleDate = (dateStr: string) => {
        const next = new Set(selectedSet);
        if (next.has(dateStr)) {
            next.delete(dateStr);
        } else {
            next.add(dateStr);
        }
        onChange(Array.from(next).sort());
    };

    const applyRange = () => {
        if (!rangeStart || !rangeEnd) return;
        const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
        const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

        const [sy, sm, sd] = start.split("-").map(Number);
        const [ey, em, ed] = end.split("-").map(Number);
        const curr = new Date(sy, sm - 1, sd);
        const last = new Date(ey, em - 1, ed);

        // Limite de segurança de 90 dias para evitar loops acidentais
        const next = new Set(selectedSet);
        let count = 0;
        while (curr <= last && count < 90) {
            next.add(toDateStr(curr));
            curr.setDate(curr.getDate() + 1);
            count++;
        }
        onChange(Array.from(next).sort());
        setShowRangeShortcut(false);
    };

    const changeMonth = (delta: number) => {
        const d = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
    };

    const sortedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);

    return (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {label}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                        {sortedDates.length} {sortedDates.length === 1 ? "dia" : "dias"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowRangeShortcut((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-indigo-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400 dark:ring-gray-700 dark:hover:bg-gray-700"
                    >
                        <Sparkles size={12} />
                        Intervalo (Início → Fim)
                    </button>
                    {sortedDates.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            title="Limpar dias selecionados"
                        >
                            <Trash2 size={12} />
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {showRangeShortcut && (
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800/80 dark:ring-gray-700">
                    <div className="flex-1 min-w-[130px]">
                        <label
                            htmlFor="watched-range-start"
                            className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300"
                        >
                            Data de início
                        </label>
                        <input
                            id="watched-range-start"
                            type="date"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                        <label
                            htmlFor="watched-range-end"
                            className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300"
                        >
                            Data de término
                        </label>
                        <input
                            id="watched-range-end"
                            type="date"
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={applyRange}
                        disabled={!rangeStart || !rangeEnd}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                        Preencher período
                    </button>
                </div>
            )}

            {/* Mini-calendário interativo */}
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {MONTHS[viewMonth]} {viewYear}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            aria-label="Mês anterior"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewYear(today.getFullYear());
                                setViewMonth(today.getMonth());
                            }}
                            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Hoje
                        </button>
                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            aria-label="Próximo mês"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map((w, idx) => (
                        <div
                            key={idx}
                            className="py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500"
                        >
                            {w}
                        </div>
                    ))}
                    {calendarCells.map(({ date, dateStr, inMonth }) => {
                        const isSelected = selectedSet.has(dateStr);
                        return (
                            <button
                                key={dateStr}
                                type="button"
                                onClick={() => toggleDate(dateStr)}
                                className={cn(
                                    "flex h-7 w-full items-center justify-center rounded-lg text-xs font-medium transition-all",
                                    isSelected
                                        ? "bg-indigo-600 font-semibold text-white shadow-sm hover:bg-indigo-500"
                                        : inMonth
                                        ? "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                                        : "text-gray-300 hover:bg-gray-50 dark:text-gray-600 dark:hover:bg-gray-800/40"
                                )}
                                title={formatDate(dateStr)}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {sortedDates.length > 0 && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Período: <strong className="text-gray-700 dark:text-gray-200">{formatDate(sortedDates[0])}</strong>
                    {sortedDates.length > 1 && (
                        <>
                            {" "}até{" "}
                            <strong className="text-gray-700 dark:text-gray-200">
                                {formatDate(sortedDates[sortedDates.length - 1])}
                            </strong>
                        </>
                    )}
                </p>
            )}
        </div>
    );
}
