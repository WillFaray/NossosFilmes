"use client";

import { useMemo, useState } from "react";
import {
    ArrowRight,
    CalendarRange,
    CheckCheck,
    Flame,
    HeartHandshake,
    Scale,
    Star,
    Trophy,
    Tv,
    Users
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { ReviewDetailModal } from "@/components/history/ReviewDetailModal";
import { getPosterUrl } from "@/lib/utils";
import { cn } from "@/lib/cn";
import type { HistoryEntry, Movie, Review, User } from "@/types";

interface HeadToHeadStats {
    totalEntries: number;
    avgDiff: number;
    affinityPercentage: number;
    bestAgreement: { movie: Movie; review: Review; diff: number; sum: number } | null;
    mostDivergent: { movie: Movie; review: Review; diff: number } | null;
    avg1: number;
    avg2: number;
    criticDiff: number;
    moreCriticalUser: User | null;
}

export default function ProfilesPage() {
    const { movies, reviews, users, updateEntry, deleteEntry } = useReviews();
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const [user1, user2] = users;

    // Entradas completas com metadados de sessão (para abrir ReviewDetailModal ao clicar em pôsteres)
    const historyEntries = useMemo<HistoryEntry[]>(() => {
        const movieMap = new Map(movies.map((m) => [m.id, m]));
        const userMap = new Map(users.map((u) => [u.id, u]));

        const reviewsByMovie = new Map<string, Review[]>();
        for (const r of reviews) {
            const list = reviewsByMovie.get(r.movieId) ?? [];
            list.push(r);
            reviewsByMovie.set(r.movieId, list);
        }
        for (const list of reviewsByMovie.values()) {
            list.sort((a, b) => a.dateWatched.localeCompare(b.dateWatched) || a.id.localeCompare(b.id));
        }

        return reviews
            .map((review) => {
                const movie = movieMap.get(review.movieId);
                const recommender = userMap.get(review.recommendedBy) ?? user1;
                const movieHistory = reviewsByMovie.get(review.movieId) ?? [review];
                const sessionIndex = movieHistory.findIndex((r) => r.id === review.id);
                const sessionNumber = sessionIndex >= 0 ? sessionIndex + 1 : 1;
                const totalSessions = movieHistory.length;

                return movie
                    ? {
                          review,
                          movie,
                          recommender,
                          sessionNumber,
                          totalSessions,
                          isRewatch: sessionNumber > 1
                      }
                    : null;
            })
            .filter((e): e is HistoryEntry => Boolean(e));
    }, [movies, reviews, users, user1]);

    const activeDetailEntry = useMemo(() => {
        if (!selectedReviewId) return null;
        return historyEntries.find((e) => e.review.id === selectedReviewId) ?? null;
    }, [historyEntries, selectedReviewId]);

    // Entradas válidas (com filme associado)
    const validEntries = useMemo(() => {
        return historyEntries.map(({ review, movie }) => ({ review, movie }));
    }, [historyEntries]);

    // Cards individuais dos dois perfis
    const profileCards = useMemo(() => {
        const pairs = [
            { user: user1, ratingKey: "ratingUser1" as const },
            { user: user2, ratingKey: "ratingUser2" as const }
        ];

        return pairs.map(({ user, ratingKey }) => {
            const totalMovies = validEntries.length;
            const avgRating =
                totalMovies > 0
                    ? validEntries.reduce((sum, { review }) => sum + review[ratingKey], 0) / totalMovies
                    : 0;
            const recommended = reviews.filter((r) => r.recommendedBy === user.id).length;

            // Top gêneros mais bem avaliados por esta pessoa
            const genreMap = new Map<string, { sum: number; count: number }>();
            for (const { review, movie } of validEntries) {
                const rating = review[ratingKey];
                for (const g of movie.genres ?? []) {
                    const curr = genreMap.get(g) ?? { sum: 0, count: 0 };
                    genreMap.set(g, { sum: curr.sum + rating, count: curr.count + 1 });
                }
            }

            const topGenres = Array.from(genreMap.entries())
                .map(([genre, { sum, count }]) => ({
                    genre,
                    avg: sum / count,
                    count
                }))
                .sort((a, b) => b.avg - a.avg || b.count - a.count)
                .slice(0, 3);

            return {
                user,
                totalMovies,
                avgRating,
                recommended,
                topGenres
            };
        });
    }, [validEntries, reviews, user1, user2]);

    // Métricas de Sintonia do Casal / Head-to-Head
    const headToHead = useMemo<HeadToHeadStats | null>(() => {
        if (validEntries.length === 0) return null;

        let totalDiff = 0;
        let maxDiff = -1;
        let mostDivergent: { movie: Movie; review: Review; diff: number } | null = null;
        let bestAgreement: { movie: Movie; review: Review; diff: number; sum: number } | null = null;

        for (const { review, movie } of validEntries) {
            const r1 = review.ratingUser1;
            const r2 = review.ratingUser2;
            const diff = Math.abs(r1 - r2);
            const sum = r1 + r2;

            totalDiff += diff;

            if (diff > maxDiff) {
                maxDiff = diff;
                mostDivergent = { movie, review, diff };
            }

            if (!bestAgreement) {
                bestAgreement = { movie, review, diff, sum };
            } else {
                if (diff < bestAgreement.diff || (diff === bestAgreement.diff && sum > bestAgreement.sum)) {
                    bestAgreement = { movie, review, diff, sum };
                }
            }
        }

        const avgDiff = totalDiff / validEntries.length;
        const affinityPercentage = Math.max(0, Math.min(100, Math.round((1 - avgDiff / 4.5) * 100)));

        const avg1 = validEntries.reduce((s, { review }) => s + review.ratingUser1, 0) / validEntries.length;
        const avg2 = validEntries.reduce((s, { review }) => s + review.ratingUser2, 0) / validEntries.length;
        const criticDiff = Math.abs(avg1 - avg2);

        let moreCriticalUser: User | null = null;
        if (avg1 < avg2) {
            moreCriticalUser = user1;
        } else if (avg2 < avg1) {
            moreCriticalUser = user2;
        }

        return {
            totalEntries: validEntries.length,
            avgDiff,
            affinityPercentage,
            bestAgreement,
            mostDivergent,
            avg1,
            avg2,
            criticDiff,
            moreCriticalUser
        };
    }, [validEntries, user1, user2]);

    const bestAgreement = headToHead?.bestAgreement;
    const mostDivergent = headToHead?.mostDivergent;

    // Top 5 Filmes (maiores médias combinadas)
    const topCoupleMovies = useMemo(() => {
        return [...validEntries]
            .map(({ movie, review }) => {
                const combinedRating = (review.ratingUser1 + review.ratingUser2) / 2;
                return {
                    movie,
                    review,
                    combinedRating
                };
            })
            .sort(
                (a, b) =>
                    b.combinedRating - a.combinedRating ||
                    b.review.dateWatched.localeCompare(a.review.dateWatched)
            )
            .slice(0, 5);
    }, [validEntries]);

    // Décadas mais assistidas e avaliadas pelo casal
    const decadeStats = useMemo(() => {
        const map = new Map<number, { count: number; sum: number }>();
        for (const { movie, review } of validEntries) {
            const dateStr = review.releaseDate || movie.release_date;
            if (!dateStr) continue;
            const year = Number(dateStr.slice(0, 4));
            if (isNaN(year) || year < 1900) continue;
            const decade = Math.floor(year / 10) * 10;
            const curr = map.get(decade) ?? { count: 0, sum: 0 };
            const avg = (review.ratingUser1 + review.ratingUser2) / 2;
            map.set(decade, { count: curr.count + 1, sum: curr.sum + avg });
        }

        return Array.from(map.entries())
            .map(([decade, { count, sum }]) => ({
                decade,
                label: decade >= 2000 ? `Anos ${decade}` : `Anos ${String(decade).slice(2)}`,
                count,
                avgRating: sum / count
            }))
            .sort((a, b) => b.count - a.count || b.decade - a.decade);
    }, [validEntries]);

    // Distribuição de plataformas (apenas sessões com plataforma informada)
    const platformStats = useMemo(() => {
        const informed = reviews.filter((r) => Boolean(r.platform?.trim()));
        if (informed.length === 0) return [];

        const countMap = new Map<string, number>();
        for (const r of informed) {
            const plat = r.platform!.trim();
            countMap.set(plat, (countMap.get(plat) ?? 0) + 1);
        }
        return Array.from(countMap.entries())
            .map(([platform, count]) => ({
                platform,
                count,
                percentage: Math.round((count / informed.length) * 100)
            }))
            .sort((a, b) => b.count - a.count);
    }, [reviews]);

    return (
        <div className="space-y-6">
            {/* Cabeçalho da página */}
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <Users size={20} />
                    </span>
                    Perfis
                </h1>
            </div>

            {/* Cards dos Perfis Individuais */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {profileCards.map(({ user, totalMovies, avgRating, recommended, topGenres }) => (
                    <Link
                        key={user.id}
                        href={`/perfis/${user.id}`}
                        className="group flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50"
                    >
                        <div>
                            {/* Cabeçalho do perfil */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <Avatar src={user.avatar} name={user.name} size="lg" />
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {user.name}
                                        </h2>
                                        <div className="mt-0.5 flex items-center gap-2">
                                            <StarRating rating={Math.round(avgRating * 2) / 2} size={13} />
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                {avgRating.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400">
                                    Ver perfil
                                    <ArrowRight size={13} />
                                </span>
                            </div>

                            {/* Resumo em linha */}
                            <div className="mt-5 grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-gray-50/80 px-3.5 py-2.5 dark:bg-gray-800/40">
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                        Filmes
                                    </p>
                                    <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                                        {totalMovies}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50/80 px-3.5 py-2.5 dark:bg-gray-800/40">
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                        Média
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1 text-lg font-bold text-gray-900 dark:text-white">
                                        {avgRating.toFixed(1)}
                                        <Star size={13} className="fill-gold-400 text-gold-400" />
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50/80 px-3.5 py-2.5 dark:bg-gray-800/40">
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                        Indicações
                                    </p>
                                    <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                                        {recommended}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Gêneros mais bem avaliados */}
                        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {topGenres.length > 0 ? (
                                    topGenres.map(({ genre, avg }) => (
                                        <span
                                            key={genre}
                                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        >
                                            {genre}
                                            <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                {avg.toFixed(1)}
                                                <Star size={10} className="fill-gold-400 text-gold-400" />
                                            </span>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        Nenhum gênero avaliado ainda
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Estatísticas da Dupla */}
            {headToHead && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 1. Sintonia da Dupla */}
                    <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                        <HeartHandshake size={16} />
                                    </span>
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                        Sintonia da Dupla
                                    </h2>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {headToHead.totalEntries} {headToHead.totalEntries === 1 ? "sessão" : "sessões"}
                                </span>
                            </div>

                            <div className="mt-5 flex items-baseline gap-2">
                                <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {headToHead.affinityPercentage}%
                                </span>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    de afinidade nas avaliações
                                </span>
                            </div>

                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                    className="h-full rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-500"
                                    style={{ width: `${headToHead.affinityPercentage}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                            <span>Diferença média por filme</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                                {headToHead.avgDiff.toFixed(1)}
                                <Star size={11} className="fill-gold-400 text-gold-400" />
                            </span>
                        </div>
                    </section>

                    {/* 2. Comparativo Crítico */}
                    <section className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                    <Scale size={16} />
                                </span>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                    Quem é mais crítico?
                                </h2>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {[
                                    { user: user1, avg: headToHead.avg1 },
                                    { user: user2, avg: headToHead.avg2 }
                                ].map(({ user, avg }) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 rounded-xl bg-gray-50/80 p-3 dark:bg-gray-800/40"
                                    >
                                        <Avatar src={user.avatar} name={user.name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-gray-600 dark:text-gray-300">
                                                {user.name.split(" ")[0]}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1 text-base font-bold text-gray-900 dark:text-white">
                                                {avg.toFixed(1)}
                                                <Star size={12} className="fill-gold-400 text-gold-400" />
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                            <span>Mais exigente</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                                {headToHead.criticDiff < 0.05 ? (
                                    "Empate técnico"
                                ) : (
                                    <>
                                        {headToHead.moreCriticalUser?.name.split(" ")[0]} (-
                                        {headToHead.criticDiff.toFixed(1)}
                                        <Star size={11} className="fill-gold-400 text-gold-400" />)
                                    </>
                                )}
                            </span>
                        </div>
                    </section>

                    {/* 3. Maior Concordância */}
                    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <CheckCheck size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Maior Concordância
                            </h2>
                        </div>

                        {bestAgreement ? (
                            <button
                                type="button"
                                onClick={() => setSelectedReviewId(bestAgreement.review.id)}
                                className="group mt-4 flex w-full items-center gap-4 text-left focus:outline-none"
                            >
                                <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:ring-indigo-400 dark:bg-gray-800 dark:ring-gray-700">
                                    {bestAgreement.movie.poster_path ? (
                                        <Image
                                            src={getPosterUrl(bestAgreement.movie.poster_path, "w342")}
                                            alt={bestAgreement.movie.title}
                                            fill
                                            sizes="56px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-gray-400">
                                            Sem capa
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <h3 className="truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                                        {bestAgreement.movie.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {[
                                            { user: user1, rating: bestAgreement.review.ratingUser1 },
                                            { user: user2, rating: bestAgreement.review.ratingUser2 }
                                        ].map(({ user, rating }) => (
                                            <div
                                                key={user.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50/80 px-2.5 py-1 text-xs ring-1 ring-gray-200/50 dark:bg-gray-800/50 dark:ring-gray-700/50"
                                            >
                                                <Avatar
                                                    src={user.avatar}
                                                    name={user.name}
                                                    size="sm"
                                                    className="h-4 w-4 shrink-0 text-[7px]"
                                                />
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {user.name.split(" ")[0]}:
                                                </span>
                                                <span className="inline-flex items-center gap-0.5 font-bold text-gray-900 dark:text-white">
                                                    {rating}
                                                    <Star size={11} className="fill-gold-400 text-gold-400 shrink-0" />
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <p className="mt-4 text-sm text-gray-400">Nenhum filme avaliado ainda.</p>
                        )}
                    </section>

                    {/* 4. Maior Discordância */}
                    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                <Flame size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Maior Discordância
                            </h2>
                        </div>

                        {mostDivergent && mostDivergent.diff > 0 ? (
                            <button
                                type="button"
                                onClick={() => setSelectedReviewId(mostDivergent.review.id)}
                                className="group mt-4 flex w-full items-center gap-4 text-left focus:outline-none"
                            >
                                <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:ring-indigo-400 dark:bg-gray-800 dark:ring-gray-700">
                                    {mostDivergent.movie.poster_path ? (
                                        <Image
                                            src={getPosterUrl(mostDivergent.movie.poster_path, "w342")}
                                            alt={mostDivergent.movie.title}
                                            fill
                                            sizes="56px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-gray-400">
                                            Sem capa
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <h3 className="truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                                        {mostDivergent.movie.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {[
                                            { user: user1, rating: mostDivergent.review.ratingUser1 },
                                            { user: user2, rating: mostDivergent.review.ratingUser2 }
                                        ].map(({ user, rating }) => (
                                            <div
                                                key={user.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50/80 px-2.5 py-1 text-xs ring-1 ring-gray-200/50 dark:bg-gray-800/50 dark:ring-gray-700/50"
                                            >
                                                <Avatar
                                                    src={user.avatar}
                                                    name={user.name}
                                                    size="sm"
                                                    className="h-4 w-4 shrink-0 text-[7px]"
                                                />
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {user.name.split(" ")[0]}:
                                                </span>
                                                <span className="inline-flex items-center gap-0.5 font-bold text-gray-900 dark:text-white">
                                                    {rating}
                                                    <Star size={11} className="fill-gold-400 text-gold-400 shrink-0" />
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <p className="mt-4 text-sm text-gray-400">
                                Nenhuma divergência registrada até agora.
                            </p>
                        )}
                    </section>
                </div>
            )}

            {/* Top Filmes (Grid de Pôsteres Clicáveis) */}
            {topCoupleMovies.length > 0 && (
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                            <Trophy size={16} />
                        </span>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Top Filmes
                        </h2>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                        {topCoupleMovies.map(({ movie, review, combinedRating }, index) => {
                            const rank = index + 1;
                            return (
                                <button
                                    key={`${movie.id}-${review.id}`}
                                    type="button"
                                    onClick={() => setSelectedReviewId(review.id)}
                                    className="group flex flex-col text-left focus:outline-none"
                                >
                                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-indigo-300 dark:bg-gray-800 dark:ring-gray-700 dark:group-hover:ring-indigo-500/50">
                                        {movie.poster_path ? (
                                            <Image
                                                src={getPosterUrl(movie.poster_path, "w342")}
                                                alt={movie.title}
                                                fill
                                                sizes="(max-width: 768px) 45vw, 18vw"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-gray-400">
                                                {movie.title}
                                            </div>
                                        )}
                                        <span className="absolute left-2 top-2 rounded-md bg-gray-900/80 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                                            #{rank}
                                        </span>
                                    </div>

                                    <h3 className="mt-2 truncate text-xs font-semibold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                                        {movie.title}
                                    </h3>

                                    <div className="mt-1 flex w-full items-center justify-between gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                                            <Star size={11} className="fill-gold-400 text-gold-400" />
                                            {combinedRating.toFixed(1)}
                                        </span>
                                        <span
                                            className="truncate text-right text-[10.5px] text-gray-500 dark:text-gray-400"
                                            title={`${user1.name}: ${review.ratingUser1} · ${user2.name}: ${review.ratingUser2}`}
                                        >
                                            {user1.name}: {review.ratingUser1} · {user2.name}: {review.ratingUser2}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Décadas Mais Assistidas & Plataformas */}
            <div
                className={cn(
                    "grid grid-cols-1 gap-6",
                    decadeStats.length > 0 && platformStats.length > 0 && "lg:grid-cols-2"
                )}
            >
                {/* Décadas */}
                {decadeStats.length > 0 && (
                    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                <CalendarRange size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Décadas Mais Assistidas
                            </h2>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {decadeStats.slice(0, 6).map(({ decade, label, count, avgRating }) => (
                                <div
                                    key={decade}
                                    className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-800/40"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                            {label}
                                        </span>
                                        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-gray-900 dark:text-white">
                                            {avgRating.toFixed(1)}
                                            <Star size={10} className="fill-gold-400 text-gold-400" />
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-base font-bold text-indigo-600 dark:text-indigo-400">
                                        {count}{" "}
                                        <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                                            {count === 1 ? "filme" : "filmes"}
                                        </span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Plataformas (exibido apenas quando houver plataformas preenchidas nas sessões) */}
                {platformStats.length > 0 && (
                    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                <Tv size={16} />
                            </span>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Plataformas
                            </h2>
                        </div>

                        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            {platformStats.map((item, idx) => {
                                const colors = [
                                    "bg-indigo-600",
                                    "bg-indigo-400",
                                    "bg-amber-500",
                                    "bg-emerald-500",
                                    "bg-sky-500"
                                ];
                                return (
                                    <div
                                        key={item.platform}
                                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            colors[idx % colors.length]
                                        )}
                                        title={`${item.platform}: ${item.percentage}% (${item.count})`}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {platformStats.map((item, idx) => {
                                const dotColors = [
                                    "bg-indigo-600",
                                    "bg-indigo-400",
                                    "bg-amber-500",
                                    "bg-emerald-500",
                                    "bg-sky-500"
                                ];
                                return (
                                    <div
                                        key={item.platform}
                                        className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-800/40"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "h-2 w-2 shrink-0 rounded-full",
                                                    dotColors[idx % dotColors.length]
                                                )}
                                            />
                                            <span className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                {item.platform}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 flex items-baseline justify-between">
                                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                                {item.percentage}%
                                            </span>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {item.count} {item.count === 1 ? "sessão" : "sessões"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>

            {/* Modal de detalhes ao clicar em qualquer filme */}
            <ReviewDetailModal
                open={Boolean(activeDetailEntry)}
                onClose={() => setSelectedReviewId(null)}
                entry={activeDetailEntry}
                user1={user1}
                user2={user2}
                users={users}
                onEdit={updateEntry}
                onDelete={deleteEntry}
            />
        </div>
    );
}
