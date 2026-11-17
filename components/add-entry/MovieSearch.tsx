"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Film, Loader2, Search, Tv } from "lucide-react";
import Image from "next/image";
import type { MediaType, Movie } from "@/types";
import { getPosterUrl } from "@/lib/utils";

interface MovieSearchProps {
    onSelect: (movie: Movie) => void;
    mediaType?: MediaType;
}

export function MovieSearch({ onSelect, mediaType = "movie" }: MovieSearchProps) {
    const searchInputId = useId();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const requestIdRef = useRef(0);

    const isTv = mediaType === "tv";

    useEffect(() => {
        setQuery("");
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

                const items: Movie[] = (data.results ?? []).map((item: Movie) => ({
                    ...item,
                    title: item.title || item.name || "Sem título",
                    release_date: item.release_date || item.first_air_date || "",
                    mediaType: isTv ? "tv" : (item.mediaType || "movie")
                }));
                setResults(items);
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

    const handleSelect = (movie: Movie) => {
        onSelect({
            ...movie,
            mediaType: isTv ? "tv" : (movie.mediaType || "movie")
        });
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <search className="relative">
            <label
                htmlFor={searchInputId}
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
                {isTv ? "Buscar série de TV" : "Buscar filme"}
            </label>
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
                            ? "Digite o nome da série (ex: Severance, Dark)..."
                            : "Digite o nome do filme..."
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
                <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-700">
                    {results.map((movie) => {
                        const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
                        return (
                            <li key={`${movie.mediaType || mediaType}-${movie.id}`}>
                                <button
                                    type="button"
                                    onClick={() => handleSelect(movie)}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
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
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {movie.title}
                                            </p>
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {isTv ? <Tv size={10} /> : <Film size={10} />}
                                                {isTv ? "Série" : "Filme"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {year || "Ano desconhecido"}
                                            {movie.genres && movie.genres.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {open && !loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl bg-white p-4 text-center text-sm text-gray-500 shadow-lg ring-1 ring-gray-200 dark:bg-card-dark dark:text-gray-400 dark:ring-gray-700">
                    {isTv
                        ? `Nenhuma série encontrada para "${query}"`
                        : `Nenhum filme encontrado para "${query}"`}
                </div>
            )}
        </search>
    );
}
