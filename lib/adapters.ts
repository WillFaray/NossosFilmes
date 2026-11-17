import type { Movie, Review, User } from "@/types";
import type { DbMovieReview, DbUser } from "./actions";

/** Converte um usuário do banco para o tipo da aplicação */
export function toAppUser(dbUser: DbUser): User {
    return {
        id: dbUser.id,
        name: dbUser.name,
        avatar: dbUser.avatarUrl
    };
}

/** Converte uma review do banco + usuários para o tipo Movie da aplicação */
export function toMovieFromReview(dbReview: DbMovieReview): Movie {
    return {
        id: dbReview.tmdbId,
        title: dbReview.title,
        poster_path: dbReview.posterPath,
        release_date: dbReview.releaseDate ?? "",
        genres: dbReview.genres,
        overview: dbReview.overview ?? undefined,
        runtime: dbReview.runtime ?? undefined,
        mediaType: dbReview.mediaType ?? "movie",
        runtimePerEpisode: dbReview.runtimePerEpisode ?? undefined
    };
}

/** Converte uma review do banco para o tipo Review da aplicação */
export function toAppReview(dbReview: DbMovieReview): Review {
    let parsedWatchedDates: string[] | string | null = dbReview.watchedDates ?? null;
    if (typeof dbReview.watchedDates === "string") {
        try {
            const parsed = JSON.parse(dbReview.watchedDates);
            if (Array.isArray(parsed)) parsedWatchedDates = parsed;
        } catch {
            // mantém string caso não seja JSON
        }
    }

    return {
        id: dbReview.id,
        movieId: dbReview.tmdbId,
        dateWatched: dbReview.dateWatched,
        ratingUser1: dbReview.ratingUser1,
        ratingUser2: dbReview.ratingUser2,
        textReview: dbReview.textReview,
        recommendedBy: dbReview.recommendedById,
        platform: dbReview.platform ?? undefined,
        runtime: dbReview.runtime ?? undefined,
        overview: dbReview.overview ?? undefined,
        releaseDate: dbReview.releaseDate ?? undefined,
        mediaType: dbReview.mediaType ?? "movie",
        seasonNumber: dbReview.seasonNumber ?? null,
        seasonName: dbReview.seasonName ?? null,
        totalEpisodes: dbReview.totalEpisodes ?? null,
        episodesWatched: dbReview.episodesWatched ?? null,
        runtimePerEpisode: dbReview.runtimePerEpisode ?? null,
        watchedDates: parsedWatchedDates,
        status: dbReview.status ?? "completed",
        abandonedReason: dbReview.abandonedReason ?? null,
        seriesProgressId: dbReview.seriesProgressId ?? null
    };
}
