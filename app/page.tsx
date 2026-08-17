"use client";

import { History } from "lucide-react";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { HistoryTabs } from "@/components/history/HistoryTabs";
import { Avatar } from "@/components/ui/Avatar";

export default function HistoryPage() {
    const { movies, reviews, users } = useReviews();

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const [user1, user2] = users;

    const entries = [...reviews]
        .sort((a, b) => new Date(b.dateWatched).getTime() - new Date(a.dateWatched).getTime())
        .map((review) => {
            const movie = movies.find((m) => m.id === review.movieId);
            const recommender = users.find((u) => u.id === review.recommendedBy) ?? user1;
            return movie ? { review, movie, recommender } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const totalMovies = reviews.length;

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
                        {totalMovies} filmes assistidos até agora
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Filmes assistidos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalMovies}</p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Último filme
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                        {entries[0]?.movie.title ?? "-"}
                    </p>
                </div>
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