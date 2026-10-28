"use client";

import { useMemo } from "react";
import {
    ArrowRight,
    CheckCheck,
    Film,
    Flame,
    HeartHandshake,
    Scale,
    Sparkles,
    Star,
    Users
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { getPosterUrl } from "@/lib/utils";
import type { Movie, Review, User } from "@/types";

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
    lessCriticalUser: User | null;
}

export default function ProfilesPage() {
    const { movies, reviews, users } = useReviews();

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const [user1, user2] = users;

    // Entradas válidas (com filme associado)
    const validEntries = useMemo(() => {
        const movieMap = new Map(movies.map((m) => [m.id, m]));
        return reviews
            .map((review) => {
                const movie = movieMap.get(review.movieId);
                return movie ? { review, movie } : null;
            })
            .filter((e): e is { review: Review; movie: Movie } => Boolean(e));
    }, [movies, reviews]);

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
            const favorites = validEntries
                .filter(({ review }) => review[ratingKey] >= 4)
                .map(({ movie }) => movie);
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
                favorites,
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

            // Maior discordância ("Discussão de Casal")
            if (diff > maxDiff) {
                maxDiff = diff;
                mostDivergent = { movie, review, diff };
            }

            // Maior concordância (menor diferença, maior soma)
            if (!bestAgreement) {
                bestAgreement = { movie, review, diff, sum };
            } else {
                if (diff < bestAgreement.diff || (diff === bestAgreement.diff && sum > bestAgreement.sum)) {
                    bestAgreement = { movie, review, diff, sum };
                }
            }
        }

        const avgDiff = totalDiff / validEntries.length;
        // Escala de afinidade: 0 diff = 100%, 4.5 max diff = 0%
        const affinityPercentage = Math.max(0, Math.min(100, Math.round((1 - avgDiff / 4.5) * 100)));

        // Quem é o mais crítico?
        const avg1 = validEntries.reduce((s, { review }) => s + review.ratingUser1, 0) / validEntries.length;
        const avg2 = validEntries.reduce((s, { review }) => s + review.ratingUser2, 0) / validEntries.length;
        const criticDiff = Math.abs(avg1 - avg2);

        let moreCriticalUser: User | null = null;
        let lessCriticalUser: User | null = null;
        if (avg1 < avg2) {
            moreCriticalUser = user1;
            lessCriticalUser = user2;
        } else if (avg2 < avg1) {
            moreCriticalUser = user2;
            lessCriticalUser = user1;
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
            moreCriticalUser,
            lessCriticalUser
        };
    }, [validEntries, user1, user2]);

    const bestAgreement = headToHead?.bestAgreement;
    const mostDivergent = headToHead?.mostDivergent;

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
                    Conheça quem está registrando os filmes e compare a sintonia da dupla
                </p>
            </div>

            {/* Grid de perfis individuais */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {profileCards.map(({ user, totalMovies, avgRating, favorites, recommended, topGenres }) => {
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
                                        {totalMovies} {totalMovies === 1 ? "filme assistido" : "filmes assistidos"}
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

                            {/* Top Gêneros */}
                            <div className="mt-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Gêneros Favoritos
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {topGenres.length > 0 ? (
                                        topGenres.map(({ genre, avg, count }) => (
                                            <span
                                                key={genre}
                                                className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                                            >
                                                {genre}
                                                <span className="text-[10px] opacity-75">
                                                    ({avg.toFixed(1)}★)
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

                            {/* Favoritos */}
                            <div className="mt-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Favoritos (nota ≥ 4)
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {favorites.length > 0 ? (
                                        favorites.slice(0, 4).map((movie) => (
                                            <span
                                                key={movie.id}
                                                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                            >
                                                {movie.title}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
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

            {/* Seção Sintonia do Casal / Head-to-Head */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">
                        <HeartHandshake size={20} />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Sintonia da Dupla
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Comparativo de afinidade e divergências cinematográficas entre {user1.name.split(" ")[0]} e {user2.name.split(" ")[0]}
                        </p>
                    </div>
                </div>

                {headToHead ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* 1. Percentual de Afinidade */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                                    <Sparkles size={14} />
                                    Percentual de Afinidade
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {headToHead.totalEntries} {headToHead.totalEntries === 1 ? "sessão" : "sessões"}
                                </span>
                            </div>

                            <div className="mt-4 flex items-baseline gap-3">
                                <span className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                    {headToHead.affinityPercentage}%
                                </span>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    de sintonia nas notas
                                </span>
                            </div>

                            {/* Barra de progresso */}
                            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 transition-all duration-500"
                                    style={{ width: `${headToHead.affinityPercentage}%` }}
                                />
                            </div>

                            <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                                {headToHead.affinityPercentage >= 85
                                    ? "Alta sintonia cinematográfica! Vocês quase sempre concordam e avaliam os filmes com notas muito parecidas."
                                    : headToHead.affinityPercentage >= 70
                                    ? "Boa sintonia! Na maior parte das sessões vocês têm impressões alinhadas, com espaço para debates saudáveis."
                                    : "Gostos bem contrastantes! Vocês costumam ter olhares diferentes sobre os mesmos filmes, o que torna cada sessão uma surpresa."}
                            </p>

                            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                                <span>Diferença média por filme:</span>
                                <strong className="font-semibold text-gray-800 dark:text-gray-200">
                                    {headToHead.avgDiff.toFixed(1)}★
                                </strong>
                            </div>
                        </div>

                        {/* 2. Quem é o mais crítico? */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                <Scale size={14} />
                                Quem é o mais crítico?
                            </div>

                            <div className="mt-4 flex items-center justify-around gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                                <div className="flex flex-col items-center gap-1 text-center">
                                    <Avatar src={user1.avatar} name={user1.name} size="sm" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {user1.name.split(" ")[0]}
                                    </span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {headToHead.avg1.toFixed(1)}★
                                    </span>
                                </div>

                                <div className="text-center text-xs font-semibold uppercase text-gray-400">
                                    vs
                                </div>

                                <div className="flex flex-col items-center gap-1 text-center">
                                    <Avatar src={user2.avatar} name={user2.name} size="sm" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {user2.name.split(" ")[0]}
                                    </span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {headToHead.avg2.toFixed(1)}★
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl bg-indigo-50/70 p-3 text-xs leading-relaxed text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
                                {headToHead.criticDiff < 0.05 ? (
                                    <span>
                                        <strong>Equilíbrio perfeito!</strong> Ambos têm a mesma média crítica com{" "}
                                        {headToHead.avg1.toFixed(1)}★.
                                    </span>
                                ) : headToHead.moreCriticalUser ? (
                                    <span>
                                        <strong>{headToHead.moreCriticalUser.name.split(" ")[0]}</strong> é o mais crítico da dupla, sendo{" "}
                                        <strong>{headToHead.criticDiff.toFixed(1)}★</strong> mais exigente nas notas do que{" "}
                                        {headToHead.lessCriticalUser?.name.split(" ")[0]}.
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {/* 3. Maior Concordância */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                <CheckCheck size={14} />
                                Maior Concordância
                            </div>

                            {bestAgreement ? (
                                <div className="mt-4 flex gap-4">
                                    <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                                        {bestAgreement.movie.poster_path ? (
                                            <Image
                                                src={getPosterUrl(bestAgreement.movie.poster_path, "w342")}
                                                alt={bestAgreement.movie.title}
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-gray-400">
                                                Sem capa
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                            {bestAgreement.movie.title}
                                        </h4>
                                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                            {bestAgreement.diff === 0
                                                ? `Ambos deram a mesma nota (${bestAgreement.review.ratingUser1}★)`
                                                : `Notas mais alinhadas (${bestAgreement.review.ratingUser1}★ vs ${bestAgreement.review.ratingUser2}★)`}
                                        </p>
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                ⭐ {bestAgreement.review.ratingUser1}★ {user1.name.split(" ")[0]}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                ⭐ {bestAgreement.review.ratingUser2}★ {user2.name.split(" ")[0]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-4 text-xs text-gray-400">Nenhum filme avaliado ainda.</p>
                            )}
                        </div>

                        {/* 4. Maior Discordância ("Discussão de Casal") */}
                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    <Flame size={14} />
                                    Maior Discordância ("Discussão de Casal")
                                </div>
                                {mostDivergent && mostDivergent.diff > 0 && (
                                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                                        {mostDivergent.diff.toFixed(1)}★ de diferença
                                    </span>
                                )}
                            </div>

                            {mostDivergent && mostDivergent.diff > 0 ? (
                                <div className="mt-4 flex gap-4">
                                    <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                                        {mostDivergent.movie.poster_path ? (
                                            <Image
                                                src={getPosterUrl(mostDivergent.movie.poster_path, "w342")}
                                                alt={mostDivergent.movie.title}
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-gray-400">
                                                Sem capa
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                            {mostDivergent.movie.title}
                                        </h4>
                                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                            Onde as opiniões da dupla mais divergiram.
                                        </p>
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                {user1.name.split(" ")[0]}: {mostDivergent.review.ratingUser1}★
                                            </span>
                                            <span className="text-gray-400">vs</span>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                {user2.name.split(" ")[0]}: {mostDivergent.review.ratingUser2}★
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-4 text-xs text-gray-400">
                                    Vocês concordaram em todas as notas até agora! Nenhuma discordância registrada.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <HeartHandshake size={36} className="text-gray-300 dark:text-gray-600" />
                        <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                            Ainda não há avaliações suficientes para calcular a sintonia da dupla.
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Avaliem filmes juntos para desbloquear afinidade, maior concordância e discussões de casal!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
