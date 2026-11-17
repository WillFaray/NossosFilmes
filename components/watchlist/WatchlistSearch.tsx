"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, Film, Loader2, Plus, Search, Tv } from "lucide-react";
import Image from "next/image";
import type { MediaType, Movie } from "@/types";
import { getPosterUrl } from "@/lib/utils";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export function WatchlistSearch() {
    const { watchlist, users, addToWatchlist } = useReviews();
    const searchInputId = useId();
    const [mediaType, setMediaType] = useState<MediaType>("movie");
    const [query, setQuery] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string>(() => users[0]?.id ?? "");
    const [results, setResults] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
    const [pendingAddId, setPendingAddId] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const addedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const requestIdRef = useRef(0);

    const isTv = mediaType === "tv";

    useEffect(() => {
        if (!selectedUserId && users[0]?.id) {
            setSelectedUserId(users[0].id);
        }
    }, [users, selectedUserId]);

    const watchlistIds = useMemo(() => new Set(watchlist.map((m) => m.id)), [watchlist]);

    useEffect(() => {
        setResults([]);
        setOpen(false);
        setError(null);
    }, [mediaType]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const trimmedQuery = query.trim();
        const currentRequestId = ++requestIdRef.current;

        if (trimmedQuery.length < 2) {
            setResults([]);
            setOpen(false);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        debounceRef.current = setTimeout(async () => {
            try {
                const endpoint = isTv
                    ? `/api/tv/search?q=${encodeURIComponent(trimmedQuery)}`
                    : `/api/movies/search?q=${encodeURIComponent(trimmedQuery)}`;
                const res = await fetch(endpoint);
                const data = await res.json();

                if (currentRequestId !== requestIdRef.current) return;
                if (!res.ok) throw new Error(data.error ?? "Erro na busca");

                const mapped: Movie[] = (data.results ?? []).map((item: Movie) => ({
                    ...item,
                    title: item.title || item.name || "Sem título",
                    release_date: item.release_date || item.first_air_date || "",
                    mediaType: isTv ? "tv" : (item.mediaType || "movie")
                }));
                setResults(mapped);
                setOpen(true);
            } catch {
                if (currentRequestId !== requestIdRef.current) return;
                setError(
                    isTv
                        ? "Não foi possível buscar séries. Tente novamente."
                        : "Não foi possível buscar filmes. Tente novamente."
                );
                setResults([]);
            } finally {
                if (currentRequestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, isTv]);

    useEffect(() => {
        return () => {
            if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
        };
    }, []);

    const handleAdd = async (movie: Movie) => {
        if (pendingAddId) return;
        setPendingAddId(movie.id);
        try {
            await addToWatchlist(
                {
                    ...movie,
                    mediaType: isTv ? "tv" : (movie.mediaType || "movie")
                },
                selectedUserId || users[0]?.id
            );
            setRecentlyAdded(movie.id);

            if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
            addedTimeoutRef.current = setTimeout(() => setRecentlyAdded(null), 2000);
        } catch (error) {
            console.error("Erro ao adicionar à lista:", error);
        } finally {
            setPendingAddId(null);
        }
    };

    return (
        <search className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                    <label
                        htmlFor={searchInputId}
                        className="text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                        Buscar e adicionar à lista
                    </label>

                    {/* Alternar Filme vs Série */}
                    <div className="inline-flex rounded-xl bg-gray-100 p-0.5 dark:bg-gray-800">
                        <button
                            type="button"
                            onClick={() => setMediaType("movie")}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                                !isTv
                                    ? "bg-white text-indigo-600 shadow-sm dark:bg-card-dark dark:text-indigo-400"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            <Film size={12} />
                            Filmes
                        </button>
                        <button
                            type="button"
                            onClick={() => setMediaType("tv")}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                                isTv
                                    ? "bg-white text-indigo-600 shadow-sm dark:bg-card-dark dark:text-indigo-400"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            )}
                        >
                            <Tv size={12} />
                            Séries
                        </button>
                    </div>
                </div>

                {users.length === 2 && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Adicionado por:
                        </span>
                        <div className="inline-flex rounded-xl bg-gray-100 p-0.5 dark:bg-gray-800">
                            {users.map((u) => {
                                const isActive = (selectedUserId || users[0]?.id) === u.id;
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => setSelectedUserId(u.id)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                                            isActive
                                                ? "bg-white text-gray-900 shadow-sm dark:bg-card-dark dark:text-white"
                                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        )}
                                    >
                                        <Avatar src={u.avatar} name={u.name} size="sm" className="h-4 w-4 text-[7px]" />
                                        {u.name.split(" ")[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <Search
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    id={searchInputId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                        isTv
                            ? "Digite o nome da série para adicionar à lista..."
                            : "Digite o nome do filme para adicionar à lista..."
                    }
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

            {open && results.length > 0 && (
                <ul className="mt-2 max-h-72 overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-700">
                    {results.map((movie) => {
                        const isInWatchlist = watchlistIds.has(movie.id);
                        const isPending = pendingAddId === movie.id;
                        const justAdded = recentlyAdded === movie.id;
                        return (
                            <li key={`${movie.mediaType || mediaType}-${movie.id}`}>
                                <button
                                    type="button"
                                    onClick={() => !isInWatchlist && handleAdd(movie)}
                                    disabled={isInWatchlist || isPending}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-gray-800 dark:disabled:hover:bg-transparent"
                                >
                                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800">
                                        {movie.poster_path ? (
                                            <Image
                                                src={getPosterUrl(movie.poster_path, "w342")}
                                                alt={movie.title}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center text-[10px] text-gray-400">
                                                Sem capa
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {movie.title}
                                            </p>
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {isTv ? <Tv size={10} /> : <Film size={10} />}
                                                {isTv ? "Série" : "Filme"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {movie.release_date
                                                ? movie.release_date.slice(0, 4)
                                                : "Ano desconhecido"}
                                            {movie.genres.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}
                                        </p>
                                    </div>
                                    {isInWatchlist ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                            <CheckCircle2 size={12} />
                                            Já está
                                        </span>
                                    ) : isPending ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                            <Loader2 size={12} className="animate-spin" />
                                            Adicionando...
                                        </span>
                                    ) : justAdded ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                            <CheckCircle2 size={12} />
                                            Adicionado!
                                        </span>
                                    ) : (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                            <Plus size={12} />
                                            Adicionar
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {open && !loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="mt-2 w-full rounded-xl bg-white p-4 text-center text-sm text-gray-500 shadow-lg ring-1 ring-gray-200 dark:bg-card-dark dark:text-gray-400 dark:ring-gray-700">
                    {isTv
                        ? `Nenhuma série encontrada para "${query}"`
                        : `Nenhum filme encontrado para "${query}"`}
                </div>
            )}
        </search>
    );
}
