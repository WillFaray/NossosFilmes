"use client";

import { ArrowRight, Film, Star, Users } from "lucide-react";
import Link from "next/link";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";

export default function ProfilesPage() {
    const { movies, reviews, users } = useReviews();

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const [user1, user2] = users;
    const pairs = [
        { user: user1, ratingKey: "ratingUser1" as const },
        { user: user2, ratingKey: "ratingUser2" as const }
    ];

    return (
        <div className="space-y-8">
            {/* Cabeçalho da página */}
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <Users size={20} />
                    </span>
                    Perfis
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Conheça quem está registrando os filmes
                </p>
            </div>

            {/* Grid de perfis */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {pairs.map(({ user, ratingKey }) => {
                    const userReviews = reviews.map((review) => ({
                        review,
                        movie: movies.find((m) => m.id === review.movieId)
                    })).filter((entry): entry is { review: (typeof reviews)[number]; movie: (typeof movies)[number] } =>
                        Boolean(entry.movie)
                    );

                    const totalMovies = userReviews.length;
                    const avgRating =
                        totalMovies > 0
                            ? userReviews.reduce((sum, { review }) => sum + review[ratingKey], 0) / totalMovies
                            : 0;
                    const favorites = userReviews
                        .filter(({ review }) => review[ratingKey] >= 4)
                        .map(({ movie }) => movie);
                    const recommended = reviews.filter((r) => r.recommendedBy === user.id).length;

                    return (
                        <Link
                            key={user.id}
                            href={`/perfis/${user.id}`}
                            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50"
                        >
                            {/* Cabeçalho do card */}
                            <div className="flex items-center gap-4">
                                <Avatar src={user.avatar} name={user.name} size="lg" />
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {user.name}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {totalMovies} filmes assistidos
                                    </p>
                                </div>
                            </div>

                            {/* Métricas */}
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <Film size={14} />
                                        Total
                                    </div>
                                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                                        {totalMovies}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <Star size={14} />
                                        Média
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                                            {avgRating.toFixed(1)}
                                        </span>
                                        <StarRating rating={Math.round(avgRating * 2) / 2} size={14} />
                                    </div>
                                </div>
                            </div>

                            {/* Favoritos */}
                            <div className="mt-6">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Favoritos (nota ≥ 4)
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {favorites.length > 0 ? (
                                        favorites.map((movie) => (
                                            <span
                                                key={movie.id}
                                                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                            >
                                                {movie.title}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-gray-400 dark:text-gray-500">
                                            Nenhum favorito ainda
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Recomendações feitas */}
                            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    <strong className="font-semibold text-gray-700 dark:text-gray-200">
                                        {recommended}
                                    </strong>{" "}
                                    {recommended === 1 ? "filme recomendado" : "filmes recomendados"} ao parceiro
                                </p>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-indigo-400">
                                    Ver perfil
                                    <ArrowRight size={13} />
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}