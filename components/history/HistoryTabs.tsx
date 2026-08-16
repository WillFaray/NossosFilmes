"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, CalendarDays, LayoutGrid, List, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { HistoryListView } from "./HistoryListView";
import { HistoryGridView } from "./HistoryGridView";
import { HistoryCalendarView } from "./HistoryCalendarView";
import type { Movie, Review, User } from "@/types";

export type HistoryView = "list" | "grid" | "calendar";

export type SortOption = "date-desc" | "date-asc" | "rating-desc" | "rating-asc";

interface HistoryTabsProps {
    entries: {
        review: Review;
        movie: Movie;
        recommender: User;
    }[];
    user1: User;
    user2: User;
}

const tabs: { id: HistoryView; label: string; icon: typeof List }[] = [
    { id: "list", label: "Diário", icon: List },
    { id: "grid", label: "Filmes", icon: LayoutGrid },
    { id: "calendar", label: "Calendário", icon: CalendarDays }
];

const sortOptions: { id: SortOption; label: string; icon: typeof Star }[] = [
    { id: "date-desc", label: "Data (recentes)", icon: ArrowDownAZ },
    { id: "date-asc", label: "Data (antigos)", icon: ArrowUpAZ },
    { id: "rating-desc", label: "Nota (maior)", icon: Star },
    { id: "rating-asc", label: "Nota (menor)", icon: Star }
];

export function HistoryTabs({ entries, user1, user2 }: HistoryTabsProps) {
    const [activeView, setActiveView] = useState<HistoryView>("list");
    const [sortBy, setSortBy] = useState<SortOption>("date-desc");
    const [recommenderFilter, setRecommenderFilter] = useState<string>("all");

    // Aplica filtro e ordenação apenas nas visões Diário e Grid
    const filteredSortedEntries = useMemo(() => {
        let result = [...entries];

        if (recommenderFilter !== "all") {
            result = result.filter((e) => e.review.recommendedBy === recommenderFilter);
        }

        switch (sortBy) {
            case "date-desc":
                result.sort((a, b) => new Date(b.review.dateWatched).getTime() - new Date(a.review.dateWatched).getTime());
                break;
            case "date-asc":
                result.sort((a, b) => new Date(a.review.dateWatched).getTime() - new Date(b.review.dateWatched).getTime());
                break;
            case "rating-desc": {
                const avg = (r: Review) => (r.ratingUser1 + r.ratingUser2) / 2;
                result.sort((a, b) => avg(b.review) - avg(a.review));
                break;
            }
            case "rating-asc": {
                const avg = (r: Review) => (r.ratingUser1 + r.ratingUser2) / 2;
                result.sort((a, b) => avg(a.review) - avg(b.review));
                break;
            }
        }

        return result;
    }, [entries, sortBy, recommenderFilter]);

    // Visão calendário sempre usa entradas completas
    const calendarEntries = useMemo(
        () => [...entries].sort(
            (a, b) => new Date(b.review.dateWatched).getTime() - new Date(a.review.dateWatched).getTime()
        ),
        [entries]
    );

    const showToolbar = activeView !== "calendar";

    return (
        <div>
            {/* Tabs */}
            <div className="mb-6 inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800/50">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeView === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white text-gray-900 shadow-sm dark:bg-card-dark dark:text-white"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Barra de ferramentas (filtros e ordenação) */}
            {showToolbar && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800 sm:flex-row sm:items-center sm:justify-between">
                    {/* Ordenação */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Ordenar
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {sortOptions.map((option) => {
                                const Icon = option.icon;
                                const isActive = sortBy === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => setSortBy(option.id)}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                        )}
                                    >
                                        <Icon size={13} />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filtro por quem indicou */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Indicado por
                        </span>
                        <div className="flex flex-wrap gap-1">
                            <button
                                onClick={() => setRecommenderFilter("all")}
                                className={cn(
                                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                    recommenderFilter === "all"
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                Todos
                            </button>
                            {[user1, user2].map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => setRecommenderFilter(user.id)}
                                    className={cn(
                                        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                        recommenderFilter === user.id
                                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    )}
                                >
                                    {user.name.split(" ")[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo com transição */}
            <div key={activeView} className="animate-slideUp">
                {activeView === "list" && (
                    <HistoryListView entries={filteredSortedEntries} user1={user1} user2={user2} />
                )}
                {activeView === "grid" && (
                    <HistoryGridView entries={filteredSortedEntries} user1={user1} user2={user2} />
                )}
                {activeView === "calendar" && (
                    <HistoryCalendarView entries={calendarEntries} user1={user1} user2={user2} />
                )}
            </div>
        </div>
    );
}