export interface DurationEntryInput {
    movie?: {
        runtime?: number | null;
        mediaType?: string | null;
        runtimePerEpisode?: number | null;
    } | null;
    review?: {
        dateWatched?: string | null;
        runtime?: number | null;
        mediaType?: string | null;
        totalEpisodes?: number | null;
        episodesWatched?: number | null;
        runtimePerEpisode?: number | null;
        seasonNumber?: number | null;
        status?: string | null;
    } | null;
}

export interface DurationResult {
    minutes: number;
    isEstimated: boolean;
}

const DEFAULT_MOVIE_FALLBACK_MINUTES = 110;
const DEFAULT_EPISODE_FALLBACK_MINUTES = 45;

/**
 * Sanitiza a entrada de duração informada pelo usuário (ex: campo de minutos por episódio).
 */
export function parseRuntimeInput(input: string, fallback: number = DEFAULT_EPISODE_FALLBACK_MINUTES): number {
    const parsed = parseInt(input, 10);
    if (isNaN(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}

/**
 * Calcula a duração em minutos de uma entrada (filme ou série) respeitando a regra R5:
 * - Filmes: runtime real com fallback de 110 min se indefinido/0.
 * - Séries: (episódios assistidos) × (duração por episódio) com fallback de 45 min/ep se indefinido/0.
 */
export function getEntryDurationMinutes(entry?: DurationEntryInput | null): DurationResult {
    if (!entry) {
        return { minutes: DEFAULT_MOVIE_FALLBACK_MINUTES, isEstimated: true };
    }

    const { movie, review } = entry;

    // Identifica se é série de TV
    const isTv =
        review?.mediaType === "tv" ||
        movie?.mediaType === "tv" ||
        review?.episodesWatched != null ||
        review?.seasonNumber != null;

    if (isTv) {
        // Se review.runtime já possui o total calculado e gravado
        if (review?.runtime && review.runtime > 0) {
            return {
                minutes: review.runtime,
                isEstimated: false
            };
        }

        const episodes = Math.max(
            1,
            review?.episodesWatched ?? review?.totalEpisodes ?? 1
        );

        let epRuntime = review?.runtimePerEpisode ?? movie?.runtimePerEpisode;
        let isEstimated = false;

        if (!epRuntime || epRuntime <= 0) {
            // Se o filme tem runtime < 180 min, pode ser o runtime do episódio
            if (movie?.runtime && movie.runtime > 0 && movie.runtime <= 120) {
                epRuntime = movie.runtime;
            } else {
                epRuntime = DEFAULT_EPISODE_FALLBACK_MINUTES;
                isEstimated = true;
            }
        }

        return {
            minutes: episodes * epRuntime,
            isEstimated
        };
    }

    // Caso Filme
    if (review?.runtime && review.runtime > 0) {
        return { minutes: review.runtime, isEstimated: false };
    }

    if (movie?.runtime && movie.runtime > 0) {
        return { minutes: movie.runtime, isEstimated: false };
    }

    return { minutes: DEFAULT_MOVIE_FALLBACK_MINUTES, isEstimated: true };
}

/**
 * Calcula a duração de uma série a partir dos episódios assistidos e duração por episódio
 */
export function calculateSeriesDuration(
    episodesWatched: number,
    runtimePerEpisode?: number | null
): DurationResult {
    const eps = Math.max(0, episodesWatched);
    if (runtimePerEpisode && runtimePerEpisode > 0) {
        return {
            minutes: eps * runtimePerEpisode,
            isEstimated: false
        };
    }
    return {
        minutes: eps * DEFAULT_EPISODE_FALLBACK_MINUTES,
        isEstimated: true
    };
}

/**
 * Formata minutos em string legível no padrão do app (ex: "2h 15m", "45m", "3h")
 */
export function formatDuration(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) return "0m";
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

/**
 * Calcula o tempo total assistido para uma coleção de entradas (filmes e/ou séries).
 */
export function calculateTotalWatchTime(
    entries: Array<DurationEntryInput>
): { totalMinutes: number; formattedTime: string } {
    let totalMinutes = 0;
    for (const entry of entries) {
        const { minutes } = getEntryDurationMinutes(entry);
        totalMinutes += minutes;
    }

    const formattedTime = formatDuration(totalMinutes);
    return { totalMinutes, formattedTime };
}

/**
 * Computa o resumo anual (contagem de obras, tempo formatado e minutos totais) para um determinado ano.
 */
export function computeYearSummary(
    entries: Array<{
        review: {
            dateWatched: string;
            runtime?: number | null;
            mediaType?: string | null;
            totalEpisodes?: number | null;
            episodesWatched?: number | null;
            runtimePerEpisode?: number | null;
            seasonNumber?: number | null;
            status?: string | null;
        };
        movie?: DurationEntryInput["movie"];
    }>,
    targetYear: string
): { count: number; formattedTime: string; totalMinutes: number } | null {
    const filtered = entries.filter((e) => e.review?.dateWatched?.startsWith(targetYear));
    if (filtered.length === 0) return null;
    const stats = calculateTotalWatchTime(filtered as DurationEntryInput[]);
    return {
        count: filtered.length,
        formattedTime: stats.formattedTime,
        totalMinutes: stats.totalMinutes
    };
}

/* ------------------------------------------------------------------ */
/* Filtros e Estatísticas Unificadas (Histórico, Watchlist & Perfis)  */
/* ------------------------------------------------------------------ */

export function filterHistory<
    T extends {
        review?: { mediaType?: string | null } | null;
        movie?: { mediaType?: string | null } | null;
    }
>(entries: T[], filter: "all" | "movie" | "movies" | "tv" | "series"): T[] {
    if (filter === "all") return entries;
    const wantTv = filter === "tv" || filter === "series";
    return entries.filter((entry) => {
        const isTv =
            entry.review?.mediaType === "tv" || entry.movie?.mediaType === "tv";
        return wantTv ? isTv : !isTv;
    });
}

export function filterWatchlist<T extends { mediaType?: string | null }>(
    items: T[],
    filter: "all" | "movie" | "movies" | "tv" | "series"
): T[] {
    if (filter === "all") return items;
    const wantTv = filter === "tv" || filter === "series";
    return items.filter((item) => {
        const isTv = item.mediaType === "tv";
        return wantTv ? isTv : !isTv;
    });
}

export function getRouletteCandidates<
    T extends {
        mediaType?: string | null;
        genres?: string[] | string | null;
        addedById?: string | null;
        addedBy?: string | null;
        runtime?: number | null;
    }
>(
    items: T[],
    options?: {
        mediaFilter?: "all" | "movie" | "movies" | "tv" | "series";
        genre?: string;
        addedById?: string;
    }
): T[] {
    const mediaFilter = options?.mediaFilter ?? "all";
    let pool = filterWatchlist(items, mediaFilter);

    if (options?.genre && options.genre !== "all") {
        pool = pool.filter((item) => {
            const gList = Array.isArray(item.genres)
                ? item.genres
                : typeof item.genres === "string"
                ? (JSON.parse(item.genres || "[]") as string[])
                : [];
            return gList.includes(options.genre!);
        });
    }

    if (options?.addedById && options.addedById !== "all") {
        pool = pool.filter(
            (item) =>
                item.addedById === options.addedById ||
                item.addedBy === options.addedById
        );
    }

    return pool;
}

export function spinRoulette<T>(candidates: T[]): T {
    if (!candidates || candidates.length === 0) {
        throw new Error("Nenhum candidato elegível para a roleta.");
    }
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
}

export function getProfilesStats(
    entries: Array<DurationEntryInput>
): {
    totalMovies: number;
    totalSeries: number;
    totalMinutes: number;
    totalFormattedTime: string;
} {
    let totalMovies = 0;
    let totalSeries = 0;
    for (const entry of entries) {
        const isTv =
            entry.review?.mediaType === "tv" ||
            entry.movie?.mediaType === "tv" ||
            entry.review?.episodesWatched != null ||
            entry.review?.seasonNumber != null;
        if (isTv) totalSeries++;
        else totalMovies++;
    }
    const { totalMinutes, formattedTime } = calculateTotalWatchTime(entries);
    return {
        totalMovies,
        totalSeries,
        totalMinutes,
        totalFormattedTime: formattedTime
    };
}

export function getProfileCardData(
    user: { id: string; name: string },
    entries: Array<{
        review: {
            ratingUser1: number;
            ratingUser2: number;
            recommendedById?: string;
            recommendedBy?: string;
            mediaType?: string | null;
        };
        movie?: { mediaType?: string | null } | null;
    }>,
    isFirstUser: boolean = true
): {
    userId: string;
    totalWatched: number;
    moviesCount: number;
    seriesCount: number;
    recommendedCount: number;
    avgRating: number;
} {
    const totalWatched = entries.length;
    let moviesCount = 0;
    let seriesCount = 0;
    let recommendedCount = 0;
    let ratingSum = 0;

    for (const { review, movie } of entries) {
        const isTv = review.mediaType === "tv" || movie?.mediaType === "tv";
        if (isTv) seriesCount++;
        else moviesCount++;

        const recBy = review.recommendedById ?? review.recommendedBy;
        if (recBy === user.id) recommendedCount++;

        ratingSum += isFirstUser ? review.ratingUser1 : review.ratingUser2;
    }

    return {
        userId: user.id,
        totalWatched,
        moviesCount,
        seriesCount,
        recommendedCount,
        avgRating: totalWatched > 0 ? ratingSum / totalWatched : 0
    };
}

export function calculateHeadToHeadStats(
    entries: Array<{
        review: { ratingUser1: number; ratingUser2: number };
    }>
): {
    totalCompared: number;
    avgDiff: number;
    affinityPercentage: number;
} | null {
    if (!entries || entries.length === 0) return null;
    let totalDiff = 0;
    for (const { review } of entries) {
        totalDiff += Math.abs(review.ratingUser1 - review.ratingUser2);
    }
    const avgDiff = totalDiff / entries.length;
    const affinityPercentage = Math.max(
        0,
        Math.min(100, Math.round((1 - avgDiff / 4.5) * 100))
    );
    return {
        totalCompared: entries.length,
        avgDiff,
        affinityPercentage
    };
}
