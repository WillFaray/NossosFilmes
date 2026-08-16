"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import Image from "next/image";
import type { Movie } from "@/types";
import { getPosterUrl } from "@/lib/utils";

interface MovieSearchProps {
    onSelect: (movie: Movie) => void;
}

export function MovieSearch({ onSelect }: MovieSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
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
                const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query.trim())}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Erro na busca");
                setResults(data.results ?? []);
                setOpen(true);
            } catch {
                setError("Não foi possível buscar filmes. Tente novamente.");
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const handleSelect = (movie: Movie) => {
        onSelect(movie);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div className="relative">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Buscar filme
            </label>
            <div className="relative">
                <Search
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Digite o nome do filme..."
                    className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                />
                {loading && (
                    <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}
            </div>

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

            {open && results.length > 0 && (
                <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-700">
                    {results.map((movie) => (
                        <li key={movie.id}>
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
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {movie.title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {movie.release_date
                                            ? new Date(movie.release_date).getFullYear()
                                            : "Ano desconhecido"}
                                        {movie.genres.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}
                                    </p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {open && !loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl bg-white p-4 text-center text-sm text-gray-500 shadow-lg ring-1 ring-gray-200 dark:bg-card-dark dark:text-gray-400 dark:ring-gray-700">
                    Nenhum filme encontrado para "{query}"
                </div>
            )}
        </div>
    );
}