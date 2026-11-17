"use client";

import { notFound } from "next/navigation";
import {
    ArrowLeft,
    Award,
    BarChart3,
    ChevronRight,
    Clock,
    Heart,
    Pencil,
    Star,
    Tag,
    TrendingDown
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { cn } from "@/lib/cn";
import {
    ProfileExpansionModal,
    type ProfileExpansionType
} from "@/components/profiles/ProfileExpansionModal";
import { EditProfileModal } from "@/components/profiles/EditProfileModal";
import { ReviewDetailModal } from "@/components/history/ReviewDetailModal";
import type { HistoryEntry, Review } from "@/types";

interface ProfilePageProps {
    params: { id: string };
}

const RATING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function formatCompactDate(dateStr?: string | null): string {
    if (!dateStr) return "";
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (match) {
        return `${match[3]}/${match[2]}`;
    }
    return formatDate(dateStr).slice(0, 5);
}

export default function ProfilePage({ params }: ProfilePageProps) {
    const { movies, reviews, users, updateUser, updateEntry, deleteEntry } = useReviews();
    const [expansion, setExpansion] = useState<ProfileExpansionType | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

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

    // Calcula as estatísticas do perfil memoizadas
    const {
        ratedEntries,
        moviesOnlyCount,
        seriesOnlyCount,
        avgRating,
        topFavorites,
        allFavorites,
        topDisappointments,
        allDisappointments,
        recommendedReviews,
        bestRecommendation,
        allRecommendations,
        recentEntries,
        allRecent,
        hitRate,
        topGenres,
        ratingBuckets
    } = useMemo(() => {
        const movieMap = new Map(movies.map((m) => [m.id, m]));

        const rated = reviews
            .map((review) => ({
                review,
                movie: movieMap.get(review.movieId)
            }))
            .filter(
                (entry): entry is { review: (typeof reviews)[number]; movie: (typeof movies)[number] } =>
                    Boolean(entry.movie)
            );

        // Nota média geral deste usuário
        const avg =
            rated.length > 0
                ? rated.reduce((sum, { review }) => sum + review[selfKey], 0) / rated.length
                : 0;

        // 3 Favoritos (maiores notas deste usuário)
        const topFavs = [...rated]
            .sort(
                (a, b) =>
                    b.review[selfKey] - a.review[selfKey] ||
                    b.review.dateWatched.localeCompare(a.review.dateWatched)
            )
            .slice(0, 3)
            .map(({ review, movie }) => ({ reviewId: review.id, movie, rating: review[selfKey] }));

        // Todos os favoritos: nota >= 4, ordenados maior -> menor
        const allFavs = rated
            .filter(({ review }) => review[selfKey] >= 4)
            .sort(
                (a, b) =>
                    b.review[selfKey] - a.review[selfKey] ||
                    b.review.dateWatched.localeCompare(a.review.dateWatched)
            )
            .map(({ review, movie }) => ({ reviewId: review.id, movie, rating: review[selfKey] }));

        // 3 Decepções (menores notas deste usuário)
        const topDisapp = [...rated]
            .sort(
                (a, b) =>
                    a.review[selfKey] - b.review[selfKey] ||
                    b.review.dateWatched.localeCompare(a.review.dateWatched)
            )
            .slice(0, 3)
            .map(({ review, movie }) => ({ reviewId: review.id, movie, rating: review[selfKey] }));

        // Todas as decepções: nota <= 2.5, ordenados menor -> maior
        const allDisapp = rated
            .filter(({ review }) => review[selfKey] <= 2.5)
            .sort(
                (a, b) =>
                    a.review[selfKey] - b.review[selfKey] ||
                    b.review.dateWatched.localeCompare(a.review.dateWatched)
            )
            .map(({ review, movie }) => ({ reviewId: review.id, movie, rating: review[selfKey] }));

        // Filmes indicados por este usuário
        const recReviews = rated.filter(({ review }) => review.recommendedBy === user.id);

        // Maior sucesso de indicação (maior nota do OUTRO)
        const bestRec = [...recReviews].sort((a, b) => b.review[otherKey] - a.review[otherKey])[0];

        // Todos os sucessos de indicação
        const allRecs = [...recReviews]
            .sort((a, b) => b.review[otherKey] - a.review[otherKey])
            .map(({ review, movie }) => ({
                reviewId: review.id,
                movie,
                rating: review[selfKey],
                otherRating: review[otherKey],
                recommender: user,
                dateWatched: review.dateWatched
            }));

        // Avaliações mais recentes (ordenadas por data decrescente)
        const sortedByDate = [...rated].sort(
            (a, b) =>
                b.review.dateWatched.localeCompare(a.review.dateWatched) ||
                b.review.id.localeCompare(a.review.id)
        );

        const recentTop3 = sortedByDate.slice(0, 3).map(({ review, movie }) => ({
            reviewId: review.id,
            movie,
            rating: review[selfKey],
            dateWatched: review.dateWatched
        }));

        const allRecentItems = sortedByDate.map(({ review, movie }) => ({
            reviewId: review.id,
            movie,
            rating: review[selfKey],
            dateWatched: review.dateWatched
        }));

        // Taxa de acerto
        const rate =
            recReviews.length > 0
                ? recReviews.reduce((sum, { review }) => sum + review[otherKey], 0) / recReviews.length
                : 0;

        // Gêneros mais bem avaliados (priorizando gêneros com 2+ filmes para evitar distorção de 1 único filme)
        const genreMap = new Map<string, { sum: number; count: number }>();
        rated.forEach(({ review, movie }) => {
            const rating = review[selfKey];
            (movie.genres ?? []).forEach((g) => {
                const current = genreMap.get(g) ?? { sum: 0, count: 0 };
                genreMap.set(g, { sum: current.sum + rating, count: current.count + 1 });
            });
        });

        const allGenres = Array.from(genreMap.entries()).map(([genre, { sum, count }]) => ({
            genre,
            avgRating: sum / count,
            count
        }));

        const hasMultipleCounts = allGenres.filter((g) => g.count >= 2).length >= 3;
        const genres = allGenres.sort((a, b) => {
            if (hasMultipleCounts) {
                const aValid = a.count >= 2 ? 1 : 0;
                const bValid = b.count >= 2 ? 1 : 0;
                if (aValid !== bValid) return bValid - aValid;
            }
            return b.avgRating - a.avgRating || b.count - a.count;
        });

        // Distribuição de Notas (0.5 a 5.0)
        const countsByStep = new Map<number, number>();
        for (const step of RATING_STEPS) {
            countsByStep.set(step, 0);
        }
        for (const { review } of rated) {
            const rounded = Math.round(review[selfKey] * 2) / 2;
            countsByStep.set(rounded, (countsByStep.get(rounded) ?? 0) + 1);
        }

        const maxCount = Math.max(1, ...Array.from(countsByStep.values()));
        const buckets = RATING_STEPS.map((step) => {
            const count = countsByStep.get(step) ?? 0;
            const percentage = rated.length > 0 ? Math.round((count / rated.length) * 100) : 0;
            return {
                step,
                count,
                percentage,
                heightPercent: rated.length > 0 ? Math.round((count / maxCount) * 100) : 0
            };
        });

        return {
            ratedEntries: rated,
            moviesOnlyCount: rated.filter(
                ({ review, movie }) =>
                    (!review.mediaType || review.mediaType === "movie") &&
                    movie.mediaType !== "tv"
            ).length,
            seriesOnlyCount: rated.filter(
                ({ review, movie }) =>
                    review.mediaType === "tv" || movie.mediaType === "tv"
            ).length,
            avgRating: avg,
            topFavorites: topFavs,
            allFavorites: allFavs,
            topDisappointments: topDisapp,
            allDisappointments: allDisapp,
            recommendedReviews: recReviews,
            bestRecommendation: bestRec,
            allRecommendations: allRecs,
            recentEntries: recentTop3,
            allRecent: allRecentItems,
            hitRate: rate,
            topGenres: genres,
            ratingBuckets: buckets
        };
    }, [reviews, movies, selfKey, otherKey, user]);

    // Dados para o modal de expansão
    const expansionData: Record<ProfileExpansionType, typeof allFavorites> = {
        favorites: allFavorites,
        disappointments: allDisappointments,
        recommendations: allRecommendations,
        recent: allRecent
    };

    const selectedEntry: HistoryEntry | null = useMemo(() => {
        if (!selectedReviewId) return null;
        const found = ratedEntries.find(({ review }) => review.id === selectedReviewId);
        if (!found) return null;

        const userMap = new Map(users.map((u) => [u.id, u]));
        const recommender = userMap.get(found.review.recommendedBy) ?? user1;
        const movieHistory = reviews
            .filter((r) => r.movieId === found.review.movieId)
            .sort((a, b) => a.dateWatched.localeCompare(b.dateWatched) || a.id.localeCompare(b.id));
        const sessionIndex = movieHistory.findIndex((r) => r.id === found.review.id);
        const sessionNumber = sessionIndex >= 0 ? sessionIndex + 1 : 1;

        return {
            review: found.review,
            movie: found.movie,
            recommender,
            sessionNumber,
            totalSessions: movieHistory.length,
            isRewatch: sessionNumber > 1
        };
    }, [selectedReviewId, ratedEntries, users, user1, reviews]);

    const PosterItem = ({
        item,
        dateWatched
    }: {
        item: { reviewId: string; movie: (typeof movies)[number]; rating: number };
        dateWatched?: string;
    }) => (
        <div
            onClick={() => setSelectedReviewId(item.reviewId)}
            className="group flex cursor-pointer flex-col"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-transform duration-200 group-hover:-translate-y-0.5 dark:bg-gray-800 dark:ring-gray-700">
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
            <h3 className="mt-2 truncate text-xs font-semibold text-gray-900 dark:text-white">
                {item.movie.title}
            </h3>
            <div className="mt-1 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                    <StarRating rating={item.rating} size={11} />
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        {item.rating.toFixed(1)}
                    </span>
                </div>
                {dateWatched && (
                    <span
                        className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500"
                        title={`Assistido em ${formatDate(dateWatched)}`}
                    >
                        {formatCompactDate(dateWatched)}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Voltar */}
            <Link
                href="/perfis"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
                <ArrowLeft size={16} />
                Voltar para Perfis
            </Link>

            {/* Cabeçalho do perfil integrado com estatísticas rápidas */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Identidade + Editar */}
                    <div className="flex items-center gap-4">
                        <Avatar
                            src={user.avatar}
                            name={user.name}
                            size="lg"
                            className="h-16 w-16 text-2xl sm:h-20 sm:w-20"
                        />
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {user.name}
                                </h1>
                                <button
                                    onClick={() => setEditOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    <Pencil size={12} />
                                    Editar perfil
                                </button>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Perfil individual e histórico de avaliações
                            </p>
                        </div>
                    </div>

                    {/* Métricas rápidas */}
                    <div className="grid grid-cols-3 gap-3 sm:min-w-[380px]">
                        <div className="rounded-xl bg-gray-50/80 px-4 py-3 dark:bg-gray-800/40">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                {seriesOnlyCount > 0 ? "Filmes / Séries" : "Filmes"}
                            </p>
                            <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
                                {seriesOnlyCount > 0
                                    ? `${moviesOnlyCount} / ${seriesOnlyCount}`
                                    : ratedEntries.length}
                            </p>
                        </div>

                        <div className="rounded-xl bg-gray-50/80 px-4 py-3 dark:bg-gray-800/40">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Nota Média
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xl font-bold text-gray-900 dark:text-white">
                                {avgRating.toFixed(1)}
                                <Star size={14} className="fill-gold-400 text-gold-400" />
                            </p>
                        </div>

                        <div
                            className="rounded-xl bg-gray-50/80 px-4 py-3 dark:bg-gray-800/40"
                            title={`Média que ${otherUser.name} deu para as ${recommendedReviews.length} obras indicadas por ${user.name}`}
                        >
                            <p className="truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                Taxa de Acerto
                            </p>
                            <div className="mt-0.5 flex items-baseline gap-1.5">
                                <span className="flex items-center gap-1 text-xl font-bold text-gray-900 dark:text-white">
                                    {recommendedReviews.length > 0 ? hitRate.toFixed(1) : "—"}
                                    {recommendedReviews.length > 0 && (
                                        <Star size={14} className="fill-gold-400 text-gold-400" />
                                    )}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    ({recommendedReviews.length})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grade de Estatísticas Balanceada (2 colunas por linha) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Linha 1, Coluna 1: 3 Favoritos */}
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
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                            Nenhum favorito ainda.
                        </p>
                    )}
                </section>

                {/* Linha 1, Coluna 2: 3 Decepções */}
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
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                            Nenhuma decepção ainda.
                        </p>
                    )}
                </section>

                {/* Linha 2, Coluna 1: Sucessos de Indicação */}
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
                                    <div
                                        key={review.id}
                                        onClick={() => setSelectedReviewId(review.id)}
                                        className="group flex cursor-pointer flex-col"
                                    >
                                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-transform duration-200 group-hover:-translate-y-0.5 dark:bg-gray-800 dark:ring-gray-700">
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
                                        <h3 className="mt-2 truncate text-xs font-semibold text-gray-900 dark:text-white">
                                            {movie.title}
                                        </h3>
                                        <div className="mt-1 flex items-center gap-1">
                                            <Avatar
                                                src={otherUser.avatar}
                                                name={otherUser.name}
                                                size="sm"
                                                className="h-3.5 w-3.5 text-[7px]"
                                            />
                                            <StarRating rating={review[otherKey]} size={11} />
                                            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                                {review[otherKey].toFixed(1)}
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

                {/* Linha 2, Coluna 2: Últimas Avaliações */}
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                <Clock size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Últimas Avaliações
                            </h2>
                        </div>
                        <button
                            onClick={() => setExpansion("recent")}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                        >
                            Ver todos
                            <ChevronRight size={13} />
                        </button>
                    </div>
                    {recentEntries.length > 0 ? (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {recentEntries.map((item, idx) => (
                                <PosterItem
                                    key={`${item.movie.id}-${idx}`}
                                    item={item}
                                    dateWatched={item.dateWatched}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                            Nenhuma avaliação recente.
                        </p>
                    )}
                </section>

                {/* Linha 3, Coluna 1: Distribuição de Notas (Estilo Letterboxd) */}
                <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                <BarChart3 size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Distribuição de Notas
                            </h2>
                        </div>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                            {ratedEntries.length}
                        </span>
                    </div>

                    {ratedEntries.length > 0 ? (
                        <div className="mt-8 flex items-end gap-3 pt-4">
                            {/* Estrela mínima (esquerda) */}
                            <div className="mb-0.5 flex shrink-0 items-center">
                                <Star size={13} className="fill-gold-400 text-gold-400" />
                            </div>

                            {/* Barras contínuas estilo Letterboxd */}
                            <div className="flex h-36 flex-1 items-end gap-[3px]">
                                {ratingBuckets.map(({ step, count, percentage, heightPercent }) => {
                                    const fullStars = Math.floor(step);
                                    const hasHalf = step % 1 !== 0;
                                    const starsText = "★".repeat(fullStars) + (hasHalf ? "½" : "");

                                    return (
                                        <div
                                            key={step}
                                            className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                        >
                                            {/* Tooltip flutuante estilo Letterboxd no hover */}
                                            <div className="pointer-events-none absolute -top-10 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-gray-100 shadow-lg group-hover:block dark:bg-gray-700">
                                                <span>
                                                    {count} {starsText} ({percentage}%)
                                                </span>
                                                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-800 dark:bg-gray-700" />
                                            </div>

                                            {/* Barra */}
                                            <div
                                                className={cn(
                                                    "w-full rounded-t-[2px] transition-colors duration-150",
                                                    count > 0
                                                        ? "bg-slate-300/90 group-hover:bg-indigo-500 dark:bg-slate-600/80 dark:group-hover:bg-indigo-400"
                                                        : "bg-slate-200/80 group-hover:bg-slate-300 dark:bg-slate-800 dark:group-hover:bg-slate-700"
                                                )}
                                                style={{
                                                    height: count > 0 ? `${Math.max(heightPercent, 6)}%` : "2px"
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 5 Estrelas máximas (direita) */}
                            <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={13} className="fill-gold-400 text-gold-400" />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                            Nenhuma avaliação registrada ainda.
                        </p>
                    )}
                </section>

                {/* Linha 3, Coluna 2: Gêneros Favoritos */}
                <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                    <Tag size={16} />
                                </span>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                    Gêneros Favoritos
                                </h2>
                            </div>
                        </div>
                        {topGenres.length > 0 ? (
                            <div className="mt-4 space-y-3.5">
                                {topGenres.slice(0, 5).map(({ genre, avgRating, count }) => (
                                    <div key={genre} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                {genre}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 dark:text-gray-500">
                                                    {count} {count === 1 ? "filme" : "filmes"}
                                                </span>
                                                <span className="inline-flex items-center gap-0.5 font-bold text-gray-900 dark:text-white">
                                                    {avgRating.toFixed(1)}
                                                    <Star size={11} className="fill-gold-400 text-gold-400" />
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, (avgRating / 5) * 100))}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                                Nenhum gênero avaliado ainda.
                            </p>
                        )}
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
                onSelectReview={(reviewId) => {
                    setExpansion(null);
                    setSelectedReviewId(reviewId);
                }}
            />

            {/* Modal de detalhes da avaliação */}
            <ReviewDetailModal
                open={Boolean(selectedEntry)}
                onClose={() => setSelectedReviewId(null)}
                entry={selectedEntry}
                user1={user1}
                user2={user2}
                users={users}
                onEdit={updateEntry}
                onDelete={deleteEntry}
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
