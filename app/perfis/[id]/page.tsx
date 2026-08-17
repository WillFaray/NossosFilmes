"use client";

import { notFound } from "next/navigation";
import { ArrowLeft, Award, ChevronRight, Heart, Pencil, Star, Target, TrendingDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { getPosterUrl } from "@/lib/utils";
import {
    ProfileExpansionModal,
    type ProfileExpansionType
} from "@/components/profiles/ProfileExpansionModal";
import { EditProfileModal } from "@/components/profiles/EditProfileModal";

interface ProfilePageProps {
    params: { id: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
    const { movies, reviews, users, updateUser } = useReviews();
    const [expansion, setExpansion] = useState<ProfileExpansionType | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const [user1, user2] = users;

    const user = users.find((u) => u.id === params.id);
    if (!user) notFound();

    // Determina qual usuário é o "perfil" e qual é o "outro"
    const isUser1 = user.id === user1.id;
    const selfKey = isUser1 ? "ratingUser1" : "ratingUser2";
    const otherKey = isUser1 ? "ratingUser2" : "ratingUser1";
    const otherUser = isUser1 ? user2 : user1;

    // Monta lista de reviews com dados do filme
    const ratedEntries = reviews
        .map((review) => ({
            review,
            movie: movies.find((m) => m.id === review.movieId)
        }))
        .filter((entry): entry is { review: (typeof reviews)[number]; movie: (typeof movies)[number] } =>
            Boolean(entry.movie)
        );

    // Nota média geral deste usuário
    const avgRating =
        ratedEntries.length > 0
            ? ratedEntries.reduce((sum, { review }) => sum + review[selfKey], 0) / ratedEntries.length
            : 0;

    // 3 Favoritos (maiores notas deste usuário)
    const topFavorites = [...ratedEntries]
        .sort((a, b) => b.review[selfKey] - a.review[selfKey])
        .slice(0, 3)
        .map(({ review, movie }) => ({ movie, rating: review[selfKey] }));

    // Todos os favoritos: nota >= 4, ordenados maior -> menor
    const allFavorites = ratedEntries
        .filter(({ review }) => review[selfKey] >= 4)
        .sort((a, b) => b.review[selfKey] - a.review[selfKey])
        .map(({ review, movie }) => ({ movie, rating: review[selfKey] }));

    // 3 Decepções (menores notas deste usuário)
    const topDisappointments = [...ratedEntries]
        .sort((a, b) => a.review[selfKey] - b.review[selfKey])
        .slice(0, 3)
        .map(({ review, movie }) => ({ movie, rating: review[selfKey] }));

    // Todas as decepções: nota <= 2.5, ordenados menor -> maior
    const allDisappointments = ratedEntries
        .filter(({ review }) => review[selfKey] <= 2.5)
        .sort((a, b) => a.review[selfKey] - b.review[selfKey])
        .map(({ review, movie }) => ({ movie, rating: review[selfKey] }));

    // Filmes indicados por este usuário
    const recommendedReviews = ratedEntries.filter(
        ({ review }) => review.recommendedBy === user.id
    );

    // Maior sucesso de indicação (maior nota do OUTRO)
    const bestRecommendation = [...recommendedReviews].sort(
        (a, b) => b.review[otherKey] - a.review[otherKey]
    )[0];

    // Todos os sucessos de indicação (indicados por este usuário, ordenados pela nota do outro)
    const allRecommendations = [...recommendedReviews]
        .sort((a, b) => b.review[otherKey] - a.review[otherKey])
        .map(({ review, movie }) => ({
            movie,
            rating: review[selfKey],
            otherRating: review[otherKey],
            recommender: user,
            dateWatched: review.dateWatched
        }));

    // Taxa de acerto
    const hitRate =
        recommendedReviews.length > 0
            ? recommendedReviews.reduce((sum, { review }) => sum + review[otherKey], 0) /
            recommendedReviews.length
            : 0;

    // Dados para o modal de expansão
    const expansionData: Record<ProfileExpansionType, typeof allFavorites> = {
        favorites: allFavorites,
        disappointments: allDisappointments,
        recommendations: allRecommendations
    };

    const PosterItem = ({ item }: { item: (typeof allFavorites)[number] }) => (
        <div className="group flex flex-col">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-indigo-300 dark:bg-gray-800 dark:ring-gray-700 dark:group-hover:ring-indigo-500/50">
                {item.movie.poster_path ? (
                    <Image
                        src={getPosterUrl(item.movie.poster_path, "w342")}
                        alt={item.movie.title}
                        fill
                        sizes="(max-width: 768px) 30vw, 15vw"
                        className="object-cover"
                    />
                ) : (
                    <span className="flex h-full items-center justify-center p-1 text-center text-[9px] text-gray-400">
                        Sem capa
                    </span>
                )}
            </div>
            <div className="mt-1.5 flex items-center gap-1">
                <StarRating rating={item.rating} size={11} />
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    {item.rating.toFixed(1).replace(".", ",")}
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Voltar */}
            <Link
                href="/perfis"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
                <ArrowLeft size={16} />
                Voltar para Perfis
            </Link>

            {/* Cabeçalho do perfil */}
            <div className="flex flex-col items-center gap-5 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                <Avatar src={user.avatar} name={user.name} size="lg" className="h-24 w-24 text-3xl" />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {user.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {ratedEntries.length} filmes assistidos
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 dark:bg-indigo-500/10">
                        <Star size={14} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                            Nota média: {avgRating.toFixed(1)}
                        </span>
                    </div>
                    <button
                        onClick={() => setEditOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        <Pencil size={14} />
                        Editar perfil
                    </button>
                </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Favoritos */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                                <Heart size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                3 Favoritos
                            </h2>
                        </div>
                        <button
                            onClick={() => setExpansion("favorites")}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                        >
                            Ver todos
                            <ChevronRight size={13} />
                        </button>
                    </div>
                    {topFavorites.length > 0 ? (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {topFavorites.map((item) => (
                                <PosterItem key={item.movie.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">Nenhum favorito ainda.</p>
                    )}
                </section>

                {/* Decepções */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                                <TrendingDown size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                3 Decepções
                            </h2>
                        </div>
                        <button
                            onClick={() => setExpansion("disappointments")}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                        >
                            Ver todos
                            <ChevronRight size={13} />
                        </button>
                    </div>
                    {topDisappointments.length > 0 ? (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {topDisappointments.map((item) => (
                                <PosterItem key={item.movie.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">Nenhuma decepção ainda.</p>
                    )}
                </section>

                {/* Maior sucesso de indicação */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                                <Award size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Sucessos de Indicação
                            </h2>
                        </div>
                        <button
                            onClick={() => setExpansion("recommendations")}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                        >
                            Ver todos
                            <ChevronRight size={13} />
                        </button>
                    </div>
                    {bestRecommendation ? (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {recommendedReviews
                                .sort((a, b) => b.review[otherKey] - a.review[otherKey])
                                .slice(0, 3)
                                .map(({ review, movie }) => (
                                    <div key={movie.id} className="group flex flex-col">
                                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-emerald-300 dark:bg-gray-800 dark:ring-gray-700 dark:group-hover:ring-emerald-500/50">
                                            {movie.poster_path ? (
                                                <Image
                                                    src={getPosterUrl(movie.poster_path, "w342")}
                                                    alt={movie.title}
                                                    fill
                                                    sizes="(max-width: 768px) 30vw, 15vw"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <span className="flex h-full items-center justify-center p-1 text-center text-[9px] text-gray-400">
                                                    Sem capa
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-1">
                                            <Avatar
                                                src={otherUser.avatar}
                                                name={otherUser.name}
                                                size="sm"
                                                className="h-4 w-4 text-[7px]"
                                            />
                                            <StarRating rating={review[otherKey]} size={11} />
                                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                                {review[otherKey].toFixed(1).replace(".", ",")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                            Nenhuma indicação feita ainda.
                        </p>
                    )}
                </section>

                {/* Taxa de acerto */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
                            <Target size={16} />
                        </span>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Taxa de Acerto
                        </h2>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {recommendedReviews.length > 0 ? hitRate.toFixed(1) : "—"}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            <p>
                                Nota média que{" "}
                                <strong className="font-semibold text-gray-800 dark:text-gray-100">
                                    {otherUser.name.split(" ")[0]}
                                </strong>{" "}
                                dá para os filmes que {user.name.split(" ")[0]} indicou.
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                {recommendedReviews.length} {recommendedReviews.length === 1 ? "indicação" : "indicações"}
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Modal de expansão */}
            <ProfileExpansionModal
                open={Boolean(expansion)}
                onClose={() => setExpansion(null)}
                type={expansion}
                items={expansion ? expansionData[expansion] : []}
                userName={user.name}
                otherUser={otherUser}
            />

            {/* Modal de edição de perfil */}
            <EditProfileModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                user={user}
                onUpdated={(updated) => {
                    updateUser(updated);
                }}
            />
        </div>
    );
}