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
        release_date: "",
        genres: dbReview.genres
    };
}

/** Converte uma review do banco para o tipo Review da aplicação */
export function toAppReview(dbReview: DbMovieReview): Review {
    return {
        id: dbReview.id,
        movieId: dbReview.tmdbId,
        dateWatched: dbReview.dateWatched,
        ratingUser1: dbReview.ratingUser1,
        ratingUser2: dbReview.ratingUser2,
        textReview: dbReview.textReview,
        recommendedBy: dbReview.recommendedById
    };
}