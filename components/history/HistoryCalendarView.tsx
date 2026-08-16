"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { Movie, Review, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { ReviewDetailModal } from "./ReviewDetailModal";

interface HistoryCalendarViewProps {
    entries: {
        review: Review;
        movie: Movie;
        recommender: User;
    }[];
    user1: User;
    user2: User;
}

interface DayEntry {
    date: Date;
    entry?: HistoryCalendarViewProps["entries"][number];
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function HistoryCalendarView({ entries, user1, user2 }: HistoryCalendarViewProps) {
    const today = useMemo(() => new Date(), []);
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedEntry, setSelectedEntry] = useState<HistoryCalendarViewProps["entries"][number] | null>(null);

    const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    const entriesByDate = useMemo(() => {
        const map = new Map<string, HistoryCalendarViewProps["entries"][number]>();
        entries.forEach((entry) => {
            const key = entry.review.dateWatched;
            map.set(key, entry);
        });
        return map;
    }, [entries]);

    const days = useMemo<DayEntry[]>(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay = new Date(viewYear, viewMonth + 1, 0);
        const startOffset = firstDay.getDay();
        const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

        const result: DayEntry[] = [];
        for (let i = 0; i < totalCells; i++) {
            const date = new Date(viewYear, viewMonth, i - startOffset + 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            result.push({
                date,
                entry: entriesByDate.get(key)
            });
        }
        return result;
    }, [viewYear, viewMonth, entriesByDate]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(newDate.getFullYear());
        setViewMonth(newDate.getMonth());
    };

    const isCurrentMonth = (date: Date) => date.getMonth() === viewMonth;
    const isToday = (date: Date) =>
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    return (
        <div>
            {/* Cabeçalho do calendário */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold capitalize text-gray-900 dark:text-gray-100">
                    {monthName}
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => {
                            setViewYear(today.getFullYear());
                            setViewMonth(today.getMonth());
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => changeMonth(1)}
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label="Próximo mês"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Calendário */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                {/* Dias da semana */}
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
                    {WEEKDAYS.map((day) => (
                        <div
                            key={day}
                            className="px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid de dias */}
                <div className="grid grid-cols-7">
                    {days.map(({ date, entry }, index) => {
                        const inCurrentMonth = isCurrentMonth(date);
                        const todayClass = isToday(date);

                        return (
                            <div
                                key={date.toISOString()}
                                className={index % 7 !== 6 ? "border-r border-b border-gray-100 dark:border-gray-800" : "border-b border-gray-100 dark:border-gray-800"}
                            >
                                {entry ? (
                                    <button
                                        onClick={() => setSelectedEntry(entry)}
                                        className="group relative block aspect-[3/4] w-full overflow-hidden bg-gray-100 transition-all duration-200 hover:z-10 hover:scale-[1.03] hover:shadow-lg hover:ring-2 hover:ring-indigo-400 dark:bg-gray-800 dark:hover:ring-indigo-500"
                                        title={`${entry.movie.title} — ${formatDate(entry.review.dateWatched)}`}
                                    >
                                        {entry.movie.poster_path ? (
                                            <Image
                                                src={getPosterUrl(entry.movie.poster_path, "w342")}
                                                alt={entry.movie.title}
                                                fill
                                                sizes="(max-width: 768px) 25vw, 14vw"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center p-1 text-center text-[9px] leading-tight text-gray-400">
                                                {entry.movie.title}
                                            </span>
                                        )}
                                        <span className="absolute left-1 top-1 rounded-md bg-gray-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                            {date.getDate()}
                                        </span>
                                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/80 to-transparent px-1 pb-1 pt-4 text-left text-[9px] font-medium leading-tight text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                            {entry.movie.title}
                                        </span>
                                    </button>
                                ) : (
                                    <div
                                        className={`flex aspect-[3/4] w-full items-start justify-center pt-2 text-xs ${inCurrentMonth
                                            ? "text-gray-500 dark:text-gray-400"
                                            : "text-gray-300 dark:text-gray-700"
                                            }`}
                                    >
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${todayClass ? "bg-indigo-600 font-semibold text-white" : ""}`}>
                                            {inCurrentMonth ? date.getDate() : ""}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal de detalhes */}
            <ReviewDetailModal
                open={Boolean(selectedEntry)}
                onClose={() => setSelectedEntry(null)}
                entry={selectedEntry}
                user1={user1}
                user2={user2}
            />
        </div>
    );
}