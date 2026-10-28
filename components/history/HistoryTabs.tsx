"use client";

import { useMemo, useState } from "react";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    CalendarDays,
    FilterX,
    LayoutGrid,
    List,
    Search,
    Star,
    X
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { HistoryListView } from "./HistoryListView";
import { HistoryGridView } from "./HistoryGridView";
import { HistoryCalendarView } from "./HistoryCalendarView";
import type { HistoryEntry, User } from "@/types";

export type HistoryView = "list" | "grid" | "calendar";

export type SortOption = "date-desc" | "date-asc" | "rating-desc" | "rating-asc";

interface HistoryTabsProps {
    entries: HistoryEntry[];
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
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("date-desc");
    const [recommenderFilter, setRecommenderFilter] = useState<string>("all");
    const [genreFilter, setGenreFilter] = useState<string>("all");
    const [minRating, setMinRating] = useState<number>(0);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Gêneros disponíveis nos registros atuais
    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        entries.forEach((e) => (e.movie.genres ?? []).forEach((g) => genres.add(g)));
        return Array.from(genres).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }, [entries]);

    const hasActiveFilters =
        Boolean(searchQuery.trim()) ||
        recommenderFilter !== "all" ||
        genreFilter !== "all" ||
        minRating > 0 ||
        Boolean(dateFrom) ||
        Boolean(dateTo);

    const clearFilters = () => {
        setSearchQuery("");
        setRecommenderFilter("all");
        setGenreFilter("all");
        setMinRating(0);
        setDateFrom("");
        setDateTo("");
    };

    // Aplica filtro e ordenação nas visões Diário e Grid
    const filteredSortedEntries = useMemo(() => {
        let result = [...entries];

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter((e) => e.movie.title.toLowerCase().includes(query));
        }

        if (recommenderFilter !== "all") {
            result = result.filter((e) => e.review.recommendedBy === recommenderFilter);
        }

        if (genreFilter !== "all") {
            result = result.filter((e) => (e.movie.genres ?? []).includes(genreFilter));
        }

        if (minRating > 0) {
            result = result.filter(
                (e) => (e.review.ratingUser1 + e.review.ratingUser2) / 2 >= minRating
            );
        }

        if (dateFrom) {
            result = result.filter((e) => e.review.dateWatched >= dateFrom);
        }

        if (dateTo) {
            result = result.filter((e) => e.review.dateWatched <= dateTo);
        }

        switch (sortBy) {
            case "date-desc":
                result.sort((a, b) => b.review.dateWatched.localeCompare(a.review.dateWatched));
                break;
            case "date-asc":
                result.sort((a, b) => a.review.dateWatched.localeCompare(b.review.dateWatched));
                break;
            case "rating-desc":
                result.sort(
                    (a, b) =>
                        b.review.ratingUser1 +
                        b.review.ratingUser2 -
                        (a.review.ratingUser1 + a.review.ratingUser2)
                );
                break;
            case "rating-asc":
                result.sort(
                    (a, b) =>
                        a.review.ratingUser1 +
                        a.review.ratingUser2 -
                        (b.review.ratingUser1 + b.review.ratingUser2)
                );
                break;
        }

        return result;
    }, [entries, searchQuery, sortBy, recommenderFilter, genreFilter, minRating, dateFrom, dateTo]);

    // Visão calendário sempre usa entradas completas ordenadas
    const calendarEntries = useMemo(
        () => [...entries].sort((a, b) => b.review.dateWatched.localeCompare(a.review.dateWatched)),
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

            {/* Barra de ferramentas (Busca, filtros e ordenação) */}
            {showToolbar && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    {/* Linha 1: Busca por título & Contagem de resultados */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar filme por título no histórico..."
                                className="w-full rounded-lg border-0 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:placeholder:text-gray-500 dark:focus:ring-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title="Limpar busca"
                                    aria-label="Limpar busca"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {filteredSortedEntries.length} de {entries.length}{" "}
                            {entries.length === 1 ? "sessão" : "sessões"}
                        </div>
                    </div>

                    {/* Linha 2: Ordenação e Filtro por quem indicou */}
                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
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

                    {/* Linha 3: Filtros avançados: gênero, nota e período */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                        {/* Gênero */}
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="genreFilter"
                                className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500"
                            >
                                Gênero
                            </label>
                            <DropdownSelect
                                ariaLabel="Filtrar por gênero"
                                className="w-36"
                                value={genreFilter}
                                onChange={setGenreFilter}
                                options={[
                                    { value: "all", label: "Todos" },
                                    ...availableGenres.map((genre) => ({
                                        value: genre,
                                        label: genre
                                    }))
                                ]}
                            />
                        </div>

                        {/* Nota mínima */}
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                <Star size={11} />
                                Nota mín.
                            </span>
                            <DropdownSelect
                                ariaLabel="Nota média mínima"
                                className="w-32"
                                value={minRating}
                                onChange={setMinRating}
                                options={[
                                    { value: 0, label: "Qualquer" },
                                    { value: 2, label: "2+ estrelas" },
                                    { value: 3, label: "3+ estrelas" },
                                    { value: 4, label: "4+ estrelas" },
                                    { value: 4.5, label: "4.5+ estrelas" }
                                ]}
                            />
                        </div>

                        {/* Período */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Período
                            </span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                aria-label="Data inicial"
                                className="rounded-lg border-0 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-200 dark:ring-gray-700 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                            <span className="text-xs text-gray-400">até</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                aria-label="Data final"
                                className="rounded-lg border-0 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-200 dark:ring-gray-700 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                        {/* Limpar filtros */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                                <FilterX size={13} />
                                Limpar filtros
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Conteúdo com transição */}
            <div key={activeView} className="animate-slideUp">
                {activeView === "list" && (
                    filteredSortedEntries.length > 0 ? (
                        <HistoryListView entries={filteredSortedEntries} user1={user1} user2={user2} />
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                            <FilterX size={40} className="text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                {hasActiveFilters
                                    ? "Nenhum filme encontrado com os filtros selecionados."
                                    : "Nenhum filme registrado ainda no diário."}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                                >
                                    <FilterX size={14} />
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    )
                )}
                {activeView === "grid" && (
                    filteredSortedEntries.length > 0 ? (
                        <HistoryGridView entries={filteredSortedEntries} user1={user1} user2={user2} />
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                            <FilterX size={40} className="text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                {hasActiveFilters
                                    ? "Nenhum filme encontrado com os filtros selecionados."
                                    : "Nenhum filme registrado ainda no diário."}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                                >
                                    <FilterX size={14} />
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    )
                )}
                {activeView === "calendar" && (
                    <HistoryCalendarView entries={calendarEntries} user1={user1} user2={user2} />
                )}
            </div>
        </div>
    );
}
