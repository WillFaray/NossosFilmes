"use client";

import { useMemo, useState } from "react";
import { Dices, FilterX, ListPlus, Search, X } from "lucide-react";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { DropdownOption, DropdownSelect } from "@/components/ui/DropdownSelect";
import { MovieCard } from "@/components/ui/MovieCard";
import { DurationFilter, matchesDuration, RouletteModal } from "@/components/watchlist/RouletteModal";
import { WatchlistSearch } from "@/components/watchlist/WatchlistSearch";
import { WatchlistDetailModal } from "@/components/watchlist/WatchlistDetailModal";
import type { Movie } from "@/types";

type WatchlistSort = "default" | "title-asc" | "title-desc" | "runtime-asc" | "runtime-desc";

export default function WatchlistPage() {
    const { watchlist, users, removeFromWatchlist } = useReviews();
    const [rouletteOpen, setRouletteOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGenre, setSelectedGenre] = useState<string>("all");
    const [selectedAddedBy, setSelectedAddedBy] = useState<string>("all");
    const [selectedDuration, setSelectedDuration] = useState<DurationFilter>("all");
    const [sortBy, setSortBy] = useState<WatchlistSort>("default");

    const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

    // Gêneros disponíveis na lista com contagem
    const availableGenres = useMemo(() => {
        const map = new Map<string, number>();
        watchlist.forEach((m) => {
            (m.genres ?? []).forEach((g) => {
                map.set(g, (map.get(g) ?? 0) + 1);
            });
        });
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
            .map(([genre, count]) => ({ genre, count }));
    }, [watchlist]);

    const genreOptions: DropdownOption<string>[] = useMemo(() => {
        return [
            { value: "all", label: `Todos os gêneros (${watchlist.length})` },
            ...availableGenres.map(({ genre, count }) => ({
                value: genre,
                label: `${genre} (${count})`
            }))
        ];
    }, [watchlist.length, availableGenres]);

    const addedByOptions: DropdownOption<string>[] = useMemo(() => {
        return [
            { value: "all", label: "Adicionado por: Todos" },
            ...users.map((u) => ({
                value: u.id,
                label: `Por ${u.name.split(" ")[0]}`
            }))
        ];
    }, [users]);

    const durationOptions: DropdownOption<DurationFilter>[] = [
        { value: "all", label: "Qualquer duração" },
        { value: "short", label: "Até 1h45 (curtos)" },
        { value: "medium", label: "Até 2h" },
        { value: "long", label: "Mais de 2h" }
    ];

    const sortOptions: DropdownOption<WatchlistSort>[] = [
        { value: "default", label: "Ordem padrão" },
        { value: "title-asc", label: "Título (A-Z)" },
        { value: "title-desc", label: "Título (Z-A)" },
        { value: "runtime-asc", label: "Mais curtos" },
        { value: "runtime-desc", label: "Mais longos" }
    ];

    // Filmes filtrados
    const filteredWatchlist = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const result = watchlist.filter((m) => {
            const matchesTitle = query === "" || m.title.toLowerCase().includes(query);
            const matchesGenre = selectedGenre === "all" || (m.genres ?? []).includes(selectedGenre);
            const matchesUser = selectedAddedBy === "all" || m.addedBy === selectedAddedBy;
            const matchesTime = matchesDuration(m.runtime, selectedDuration);
            return matchesTitle && matchesGenre && matchesUser && matchesTime;
        });

        if (sortBy === "title-asc") {
            result.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
        } else if (sortBy === "title-desc") {
            result.sort((a, b) => b.title.localeCompare(a.title, "pt-BR"));
        } else if (sortBy === "runtime-asc") {
            result.sort((a, b) => (a.runtime ?? 999) - (b.runtime ?? 999));
        } else if (sortBy === "runtime-desc") {
            result.sort((a, b) => (b.runtime ?? 0) - (a.runtime ?? 0));
        }

        return result;
    }, [watchlist, searchQuery, selectedGenre, selectedAddedBy, selectedDuration, sortBy]);

    const hasActiveFilters =
        searchQuery.trim() !== "" ||
        selectedGenre !== "all" ||
        selectedAddedBy !== "all" ||
        selectedDuration !== "all" ||
        sortBy !== "default";

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedGenre("all");
        setSelectedAddedBy("all");
        setSelectedDuration("all");
        setSortBy("default");
    };

    return (
        <div className="space-y-8">
            {/* Cabeçalho da página */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <ListPlus size={20} />
                        </span>
                        Lista de Interesse
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {hasActiveFilters
                            ? `Exibindo ${filteredWatchlist.length} de ${watchlist.length} ${watchlist.length === 1 ? "filme" : "filmes"}`
                            : `${watchlist.length} ${watchlist.length === 1 ? "filme" : "filmes"} na lista para assistir`}
                    </p>
                </div>

                {/* Botão Roleta */}
                <button
                    onClick={() => setRouletteOpen(true)}
                    disabled={watchlist.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Dices size={18} />
                    Roleta
                </button>
            </div>

            {/* Busca para adicionar filmes */}
            <WatchlistSearch />

            {/* Filtros e Busca interna da Lista */}
            {watchlist.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Busca por título */}
                        <div className="relative min-w-[200px] flex-1">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filtrar por título na sua lista..."
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

                        {/* Gênero */}
                        <div className="w-full sm:w-48">
                            <DropdownSelect
                                value={selectedGenre}
                                options={genreOptions}
                                onChange={setSelectedGenre}
                                ariaLabel="Filtrar lista por gênero"
                            />
                        </div>

                        {/* Quem adicionou */}
                        {users.length === 2 && (
                            <div className="w-full sm:w-44">
                                <DropdownSelect
                                    value={selectedAddedBy}
                                    options={addedByOptions}
                                    onChange={setSelectedAddedBy}
                                    ariaLabel="Filtrar por quem adicionou"
                                />
                            </div>
                        )}

                        {/* Duração */}
                        <div className="w-full sm:w-40">
                            <DropdownSelect
                                value={selectedDuration}
                                options={durationOptions}
                                onChange={setSelectedDuration}
                                ariaLabel="Filtrar por duração"
                            />
                        </div>

                        {/* Ordenação */}
                        <div className="w-full sm:w-36">
                            <DropdownSelect
                                value={sortBy}
                                options={sortOptions}
                                onChange={setSortBy}
                                ariaLabel="Ordenar lista de interesse"
                            />
                        </div>

                        {/* Botão limpar filtros */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                                <FilterX size={13} />
                                Limpar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Grid de filmes */}
            {watchlist.length > 0 ? (
                filteredWatchlist.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                        {filteredWatchlist.map((movie, index) => (
                            <MovieCard
                                key={movie.id}
                                movie={movie}
                                index={index}
                                addedByUser={movie.addedBy ? userMap.get(movie.addedBy) : undefined}
                                onSelect={(m) => setSelectedMovie(m)}
                                onRemove={(m) => removeFromWatchlist(m.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <FilterX size={40} className="text-gray-300 dark:text-gray-600" />
                        <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nenhum filme encontrado com os filtros selecionados.
                        </p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                        >
                            <FilterX size={14} />
                            Limpar filtros
                        </button>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <ListPlus size={40} className="text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nenhum filme na lista de interesse ainda. Busque acima para adicionar.
                    </p>
                </div>
            )}

            {/* Modal de Detalhes do Filme na Watchlist */}
            <WatchlistDetailModal
                open={Boolean(selectedMovie)}
                onClose={() => setSelectedMovie(null)}
                movie={selectedMovie}
                addedByUser={selectedMovie?.addedBy ? userMap.get(selectedMovie.addedBy) : undefined}
                onRemove={removeFromWatchlist}
            />

            {/* Modal da Roleta */}
            <RouletteModal
                open={rouletteOpen}
                onClose={() => setRouletteOpen(false)}
                movies={watchlist}
                users={users}
                initialGenre={selectedGenre}
                initialAddedBy={selectedAddedBy}
                initialDuration={selectedDuration}
            />
        </div>
    );
}
