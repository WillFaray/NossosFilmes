"use client";

import { useMemo } from "react";
import { Clock, History } from "lucide-react";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { HistoryTabs } from "@/components/history/HistoryTabs";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";
import type { HistoryEntry, Review } from "@/types";

export default function HistoryPage() {
    const { movies, reviews, users } = useReviews();

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const [user1, user2] = users;

    const entries = useMemo<HistoryEntry[]>(() => {
        const movieMap = new Map(movies.map((m) => [m.id, m]));
        const userMap = new Map(users.map((u) => [u.id, u]));

        // Agrupa sessões por movieId para calcular a ordem cronológica de cada sessão (Rewatch)
        const reviewsByMovie = new Map<string, Review[]>();
        for (const r of reviews) {
            const list = reviewsByMovie.get(r.movieId) ?? [];
            list.push(r);
            reviewsByMovie.set(r.movieId, list);
        }
        for (const list of reviewsByMovie.values()) {
            list.sort((a, b) => a.dateWatched.localeCompare(b.dateWatched) || a.id.localeCompare(b.id));
        }

        return [...reviews]
            .sort((a, b) => b.dateWatched.localeCompare(a.dateWatched))
            .map((review) => {
                const movie = movieMap.get(review.movieId);
                const recommender = userMap.get(review.recommendedBy) ?? user1;
                const movieHistory = reviewsByMovie.get(review.movieId) ?? [review];
                const sessionIndex = movieHistory.findIndex((r) => r.id === review.id);
                const sessionNumber = sessionIndex >= 0 ? sessionIndex + 1 : 1;
                const totalSessions = movieHistory.length;
                const isRewatch = sessionNumber > 1;

                return movie
                    ? {
                          review,
                          movie,
                          recommender,
                          sessionNumber,
                          totalSessions,
                          isRewatch
                      }
                    : null;
            })
            .filter((entry): entry is HistoryEntry => Boolean(entry));
    }, [reviews, movies, users, user1]);

    const totalMovies = reviews.length;
    const uniqueMoviesCount = useMemo(() => new Set(reviews.map((r) => r.movieId)).size, [reviews]);
    const rewatchSessionsCount = totalMovies - uniqueMoviesCount;

    // Cálculo do total de horas assistidas juntas (usando runtime do filme ou média padrão de 110min)
    const runtimeStats = useMemo(() => {
        const DEFAULT_RUNTIME = 110;
        let totalMinutes = 0;
        let estimatedCount = 0;

        for (const entry of entries) {
            if (entry.movie.runtime && entry.movie.runtime > 0) {
                totalMinutes += entry.movie.runtime;
            } else {
                totalMinutes += DEFAULT_RUNTIME;
                estimatedCount++;
            }
        }

        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        const formattedTime =
            totalHours === 0
                ? `${remainingMinutes}min`
                : remainingMinutes === 0
                ? `${totalHours}h`
                : `${totalHours}h ${remainingMinutes}m`;

        return {
            totalHours,
            remainingMinutes,
            formattedTime,
            isEstimated: estimatedCount > 0
        };
    }, [entries]);

    return (
        <div className="space-y-8">
            {/* Cabeçalho da página */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <History size={20} />
                        </span>
                        Histórico
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {totalMovies} {totalMovies === 1 ? "filme assistido" : "filmes assistidos"} até agora
                    </p>
                </div>

                {/* Avatares dos dois usuários */}
                <div className="flex items-center gap-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800"
                        >
                            <Avatar src={user.avatar} name={user.name} size="sm" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {user.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Resumo geral */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Total de Filmes / Sessões */}
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Filmes assistidos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalMovies}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {totalMovies === 0
                            ? "Nenhum filme registrado"
                            : rewatchSessionsCount > 0
                            ? `${uniqueMoviesCount} títulos (${rewatchSessionsCount} ${rewatchSessionsCount === 1 ? "re-watch" : "re-watches"})`
                            : `${totalMovies} ${totalMovies === 1 ? "sessão" : "sessões"}`}
                    </p>
                </div>

                {/* 2. Tempo Juntos no Cinema */}
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Clock size={13} className="text-indigo-600 dark:text-indigo-400" />
                        Tempo no cinema
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {totalMovies === 0 ? "0h" : runtimeStats.formattedTime}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {totalMovies === 0
                            ? "Nenhuma sessão ainda"
                            : runtimeStats.isEstimated
                            ? "Horas juntas (~1h50/filme)"
                            : "Duração total das sessões"}
                    </p>
                </div>

                {/* 3. Último Filme */}
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Último filme
                    </p>
                    <p className="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
                        {entries[0]?.movie.title ?? "-"}
                    </p>
                    {entries[0] && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Assistido em {formatDate(entries[0].review.dateWatched)}
                        </p>
                    )}
                </div>

                {/* 4. Total de Indicações */}
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Total de Indicações
                    </p>
                    <div className="mt-2 space-y-2">
                        {users.map((user) => {
                            const count = reviews.filter((r) => r.recommendedBy === user.id).length;
                            return (
                                <div key={user.id} className="flex items-center gap-2">
                                    <Avatar src={user.avatar} name={user.name} size="sm" className="h-6 w-6 text-[9px]" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {user.name.split(" ")[0]}
                                    </span>
                                    <span className="ml-auto text-lg font-bold text-gray-900 dark:text-white">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Visualizações do histórico */}
            <HistoryTabs entries={entries} user1={user1} user2={user2} />
        </div>
    );
}
