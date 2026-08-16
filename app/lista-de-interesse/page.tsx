"use client";

import { useState } from "react";
import { Dices, ListPlus } from "lucide-react";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { MovieCard } from "@/components/ui/MovieCard";
import { RouletteModal } from "@/components/watchlist/RouletteModal";
import { WatchlistSearch } from "@/components/watchlist/WatchlistSearch";

export default function WatchlistPage() {
    const { watchlist } = useReviews();
    const [rouletteOpen, setRouletteOpen] = useState(false);

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
                        {watchlist.length} filmes na lista para assistir
                    </p>
                </div>

                {/* Botão Roleta */}
                <button
                    onClick={() => setRouletteOpen(true)}
                    disabled={watchlist.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                    <Dices size={18} />
                    Roleta
                </button>
            </div>

            {/* Busca para adicionar filmes */}
            <WatchlistSearch />

            {/* Grid de filmes */}
            {watchlist.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                    {watchlist.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <ListPlus size={40} className="text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nenhum filme na lista de interesse ainda. Busque acima para adicionar.
                    </p>
                </div>
            )}

            {/* Modal da Roleta */}
            <RouletteModal
                open={rouletteOpen}
                onClose={() => setRouletteOpen(false)}
                movies={watchlist}
            />
        </div>
    );
}