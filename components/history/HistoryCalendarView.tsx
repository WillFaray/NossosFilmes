"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Tv } from "lucide-react";
import Image from "next/image";
import type { CalendarSessionItem, HistoryEntry, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { ReviewDetailModal } from "./ReviewDetailModal";
import { CheckInDetailModal } from "@/components/in-progress/CheckInDetailModal";

interface HistoryCalendarViewProps {
    entries: HistoryEntry[];
    user1: User;
    user2: User;
    mediaFilter?: "all" | "movie" | "tv";
}

type CalendarCellItem =
    | {
          kind: "review";
          id: string;
          dateWatched: string;
          entry: HistoryEntry;
          sessionTag?: string;
      }
    | {
          kind: "checkin";
          id: string;
          dateWatched: string;
          session: CalendarSessionItem;
      };

interface DayEntry {
    date: Date;
    items: CalendarCellItem[];
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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
const MAX_POSTERS_PER_DAY = 3;

export function HistoryCalendarView({
    entries,
    user1,
    user2,
    mediaFilter = "all"
}: HistoryCalendarViewProps) {
    const { users, updateEntry, deleteEntry, allSeriesProgress } = useReviews();
    const today = useMemo(() => new Date(), []);

    // Constrói todas as sessões de check-in de séries
    const checkinSessions = useMemo<CalendarSessionItem[]>(() => {
        if (mediaFilter === "movie") return [];
        const list: CalendarSessionItem[] = [];
        for (const sp of allSeriesProgress) {
            for (const checkin of sp.checkins) {
                list.push({
                    id: checkin.id,
                    dateWatched: checkin.dateWatched,
                    mediaType: "tv",
                    title: sp.title,
                    posterPath: sp.posterPath,
                    sessionTag: checkin.episodeTag,
                    checkin,
                    seriesProgress: sp
                });
            }
        }
        return list.sort((a, b) => b.dateWatched.localeCompare(a.dateWatched));
    }, [allSeriesProgress, mediaFilter]);

    const initialViewDate = useMemo(() => {
        const candidateDates: string[] = [];
        if (entries.length > 0) candidateDates.push(entries[0].review.dateWatched);
        if (checkinSessions.length > 0) candidateDates.push(checkinSessions[0].dateWatched);
        candidateDates.sort((a, b) => b.localeCompare(a));

        if (candidateDates.length > 0) {
            const latest = candidateDates[0];
            const y = Number(latest.slice(0, 4));
            const m = Number(latest.slice(5, 7)) - 1;
            if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
                return { year: y, month: m };
            }
        }
        return { year: today.getFullYear(), month: today.getMonth() };
    }, [entries, checkinSessions, today]);

    const [viewYear, setViewYear] = useState(initialViewDate.year);
    const [viewMonth, setViewMonth] = useState(initialViewDate.month);
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
    const [selectedCheckin, setSelectedCheckin] =
        useState<CalendarSessionItem | null>(null);

    const activeEntry = useMemo(() => {
        if (!selectedEntry) return null;
        return (
            entries.find((e) => e.review.id === selectedEntry.review.id) ??
            selectedEntry
        );
    }, [entries, selectedEntry]);

    // Anos disponíveis nas avaliações + check-ins + ano atual
    const availableYears = useMemo(() => {
        const yearSet = new Set<number>([today.getFullYear()]);
        entries.forEach((e) => {
            const y = Number(e.review.dateWatched.slice(0, 4));
            if (!isNaN(y) && y > 1900) yearSet.add(y);
        });
        checkinSessions.forEach((c) => {
            const y = Number(c.dateWatched.slice(0, 4));
            if (!isNaN(y) && y > 1900) yearSet.add(y);
        });
        return Array.from(yearSet).sort((a, b) => b - a);
    }, [entries, checkinSessions, today]);

    // Agrupa tanto reviews quanto check-ins de séries por data (YYYY-MM-DD)
    const itemsByDate = useMemo(() => {
        const map = new Map<string, CalendarCellItem[]>();
        const checkinKeySet = new Set<string>();

        const pushItem = (dateKey: string, item: CalendarCellItem) => {
            const list = map.get(dateKey);
            if (list) {
                list.push(item);
            } else {
                map.set(dateKey, [item]);
            }
        };

        // 1. Adiciona sessões de check-in de séries ("S01 • Eps 3-4")
        for (const session of checkinSessions) {
            const spId = session.seriesProgress?.id;
            const tmdbId = session.seriesProgress?.tmdbId;
            if (spId) checkinKeySet.add(`sp:${spId}:${session.dateWatched}`);
            if (tmdbId) checkinKeySet.add(`tmdb:${tmdbId}:${session.dateWatched}`);

            pushItem(session.dateWatched, {
                kind: "checkin",
                id: `checkin-${session.id}`,
                dateWatched: session.dateWatched,
                session
            });
        }

        // 2. Adiciona avaliações (filmes e séries retroativas)
        for (const entry of entries) {
            const isTv =
                entry.review.mediaType === "tv" || entry.movie.mediaType === "tv";
            if (mediaFilter === "movie" && isTv) continue;
            if (mediaFilter === "tv" && !isTv) continue;

            const seasonBadge = isTv
                ? entry.review.seasonNumber
                    ? `S${String(entry.review.seasonNumber).padStart(2, "0")}${
                          entry.review.episodesWatched
                              ? ` • ${entry.review.episodesWatched} eps`
                              : ""
                      }`
                    : entry.review.seasonName || "Série"
                : undefined;

            // Se a avaliação de série possui watchedDates múltiplos, expande nos dias sem check-in duplicado
            let datesToRender = [entry.review.dateWatched];
            if (isTv && entry.review.watchedDates) {
                if (Array.isArray(entry.review.watchedDates) && entry.review.watchedDates.length > 0) {
                    datesToRender = entry.review.watchedDates;
                } else if (typeof entry.review.watchedDates === "string") {
                    try {
                        const parsed = JSON.parse(entry.review.watchedDates);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            datesToRender = parsed;
                        }
                    } catch {
                        // mantém dateWatched
                    }
                }
            }

            for (const dateKey of datesToRender) {
                if (isTv) {
                    const hasSpCheckin =
                        entry.review.seriesProgressId &&
                        checkinKeySet.has(
                            `sp:${entry.review.seriesProgressId}:${dateKey}`
                        );
                    const hasTmdbCheckin = checkinKeySet.has(
                        `tmdb:${entry.movie.id}:${dateKey}`
                    );
                    if (hasSpCheckin || hasTmdbCheckin) {
                        continue;
                    }
                }

                pushItem(dateKey, {
                    kind: "review",
                    id: `review-${entry.review.id}-${dateKey}`,
                    dateWatched: dateKey,
                    entry,
                    sessionTag: seasonBadge
                });
            }
        }

        return map;
    }, [entries, checkinSessions, mediaFilter]);

    // Quantidade total de sessões no mês atualmente aberto
    const currentMonthCount = useMemo(() => {
        const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        let total = 0;
        for (const [dateKey, list] of itemsByDate.entries()) {
            if (dateKey.startsWith(prefix)) {
                total += list.length;
            }
        }
        return total;
    }, [itemsByDate, viewYear, viewMonth]);

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
                items: itemsByDate.get(key) ?? []
            });
        }
        return result;
    }, [viewYear, viewMonth, itemsByDate]);

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

    const handleCellItemClick = (item: CalendarCellItem) => {
        if (item.kind === "checkin") {
            setSelectedCheckin(item.session);
        } else {
            setSelectedEntry(item.entry);
        }
    };

    return (
        <div>
            {/* Cabeçalho do calendário com seletor rápido de Mês/Ano */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={viewMonth}
                        onChange={(e) => setViewMonth(Number(e.target.value))}
                        aria-label="Selecionar mês"
                        className="rounded-xl border-0 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-white dark:ring-gray-800"
                    >
                        {MONTHS.map((m, idx) => (
                            <option key={m} value={idx}>
                                {m}
                            </option>
                        ))}
                    </select>

                    <select
                        value={viewYear}
                        onChange={(e) => setViewYear(Number(e.target.value))}
                        aria-label="Selecionar ano"
                        className="rounded-xl border-0 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-white dark:ring-gray-800"
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>

                    <span className="ml-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {currentMonthCount}{" "}
                        {currentMonthCount === 1 ? "sessão no mês" : "sessões no mês"}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setViewYear(today.getFullYear());
                            setViewMonth(today.getMonth());
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        Hoje
                    </button>
                    <button
                        type="button"
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
                    {days.map(({ date, items: dayItems }, index) => {
                        const inCurrentMonth = isCurrentMonth(date);
                        const todayClass = isToday(date);
                        const hasItems = dayItems.length > 0;

                        return (
                            <div
                                key={date.toISOString()}
                                className={
                                    index % 7 !== 6
                                        ? "border-r border-b border-gray-100 dark:border-gray-800"
                                        : "border-b border-gray-100 dark:border-gray-800"
                                }
                            >
                                {hasItems ? (
                                    <div className="relative aspect-[3/4] w-full bg-gray-100 dark:bg-gray-800">
                                        {/* Posters do dia (até MAX_POSTERS_PER_DAY) */}
                                        <div className="flex h-full w-full">
                                            {dayItems
                                                .slice(0, MAX_POSTERS_PER_DAY)
                                                .map((cellItem) => {
                                                    const title =
                                                        cellItem.kind === "checkin"
                                                            ? cellItem.session.title
                                                            : cellItem.entry.movie.title;
                                                    const posterPath =
                                                        cellItem.kind === "checkin"
                                                            ? cellItem.session.posterPath
                                                            : cellItem.entry.movie.poster_path;
                                                    const sessionTag =
                                                        cellItem.kind === "checkin"
                                                            ? cellItem.session.sessionTag
                                                            : cellItem.sessionTag;
                                                    const isRewatch =
                                                        cellItem.kind === "review" &&
                                                        cellItem.entry.isRewatch;
                                                    const isTv =
                                                        cellItem.kind === "checkin" ||
                                                        cellItem.entry.review.mediaType ===
                                                            "tv" ||
                                                        cellItem.entry.movie.mediaType ===
                                                            "tv";

                                                    return (
                                                        <button
                                                            key={cellItem.id}
                                                            type="button"
                                                            onClick={() =>
                                                                handleCellItemClick(cellItem)
                                                            }
                                                            className="group relative min-w-0 flex-1 overflow-hidden transition-all duration-200 hover:z-10 hover:scale-[1.05] hover:shadow-lg hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-500"
                                                            title={`${title}${
                                                                sessionTag
                                                                    ? ` (${sessionTag})`
                                                                    : ""
                                                            } — ${formatDate(
                                                                cellItem.dateWatched
                                                            )}`}
                                                            aria-label={`Ver detalhes de ${title}`}
                                                        >
                                                            {posterPath ? (
                                                                <Image
                                                                    src={getPosterUrl(
                                                                        posterPath,
                                                                        "w342"
                                                                    )}
                                                                    alt={title}
                                                                    fill
                                                                    sizes="(max-width: 768px) 25vw, 14vw"
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <span className="flex h-full items-center justify-center p-1 text-center text-[9px] leading-tight text-gray-400">
                                                                    {title}
                                                                </span>
                                                            )}

                                                            {/* Indicador de TV ou Rewatch no topo direito */}
                                                            {isTv ? (
                                                                <span
                                                                    className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-sm backdrop-blur-sm"
                                                                    title="Série de TV"
                                                                >
                                                                    <Tv size={8} />
                                                                </span>
                                                            ) : isRewatch ? (
                                                                <span
                                                                    className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm"
                                                                    title={`Re-watch (${cellItem.entry.sessionNumber}ª vez)`}
                                                                >
                                                                    <RotateCcw size={8} />
                                                                </span>
                                                            ) : null}

                                                            {/* Etiqueta da sessão de série (ex: S01 • Eps 3-4) */}
                                                            {sessionTag ? (
                                                                <span className="pointer-events-none absolute inset-x-0.5 bottom-0.5 z-10 truncate rounded bg-indigo-950/90 px-1 py-0.5 text-center text-[8px] font-bold tracking-tight text-indigo-100 shadow-sm backdrop-blur-sm sm:text-[9px]">
                                                                    {sessionTag}
                                                                </span>
                                                            ) : (
                                                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/80 to-transparent px-1 pb-1 pt-4 text-left text-[9px] font-medium leading-tight text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                                    {title}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}

                                            {dayItems.length > MAX_POSTERS_PER_DAY && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleCellItemClick(
                                                            dayItems[MAX_POSTERS_PER_DAY]
                                                        )
                                                    }
                                                    className="flex w-8 shrink-0 flex-col items-center justify-center bg-gray-200/80 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-700/80 dark:text-gray-300 dark:hover:bg-indigo-500/10"
                                                    title={`+${dayItems.length - MAX_POSTERS_PER_DAY} sessão(ões) neste dia`}
                                                    aria-label={`Ver mais ${dayItems.length - MAX_POSTERS_PER_DAY} sessão(ões) deste dia`}
                                                >
                                                    +{dayItems.length - MAX_POSTERS_PER_DAY}
                                                </button>
                                            )}
                                        </div>

                                        {/* Dia do mês */}
                                        <span className="pointer-events-none absolute left-1 top-1 z-10 rounded-md bg-gray-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                            {date.getDate()}
                                        </span>
                                    </div>
                                ) : (
                                    <div
                                        className={`flex aspect-[3/4] w-full items-start justify-center pt-2 text-xs ${
                                            inCurrentMonth
                                                ? "text-gray-500 dark:text-gray-400"
                                                : "text-gray-300 dark:text-gray-700"
                                        }`}
                                    >
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                                todayClass
                                                    ? "bg-indigo-600 font-semibold text-white"
                                                    : ""
                                            }`}
                                        >
                                            {inCurrentMonth ? date.getDate() : ""}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal de detalhes de avaliação (Filme ou Temporada concluída) */}
            <ReviewDetailModal
                open={Boolean(activeEntry)}
                onClose={() => setSelectedEntry(null)}
                entry={activeEntry}
                user1={user1}
                user2={user2}
                users={users}
                onEdit={updateEntry}
                onDelete={deleteEntry}
            />

            {/* Modal de detalhes de Check-in de Série em Andamento */}
            <CheckInDetailModal
                open={Boolean(selectedCheckin)}
                onClose={() => setSelectedCheckin(null)}
                session={selectedCheckin}
            />
        </div>
    );
}
