"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Movie, Review, User } from "@/types";
import type { DbMovieReview, DbUser, DbWatchlistItem } from "@/lib/actions";
import {
    addMovieReview,
    addToWatchlist,
    deleteMovieReview,
    removeFromWatchlist,
    updateMovieReview
} from "@/lib/actions";

import { toAppReview, toAppUser, toMovieFromReview } from "@/lib/adapters";

interface ReviewProviderValue {
    users: User[];
    movies: Movie[];
    reviews: Review[];
    watchlist: Movie[];
    updateUser: (updated: User) => void;
    addEntry: (entry: {
        movie: Movie;
        dateWatched: string;
        ratingUser1: number;
        ratingUser2: number;
        textReview: string;
        recommendedBy: string;
    }) => void;
    updateEntry: (id: string, entry: {
        movie: Movie;
        dateWatched: string;
        ratingUser1: number;
        ratingUser2: number;
        textReview: string;
        recommendedBy: string;
    }) => void;
    deleteEntry: (id: string) => void;
    addToWatchlist: (movie: Movie) => void;
    removeFromWatchlist: (id: string) => void;
}


interface ReviewProviderProps {
    children: React.ReactNode;
    initialUsers: DbUser[];
    initialReviews: DbMovieReview[];
    initialWatchlist: DbWatchlistItem[];
}

const ReviewContext = createContext<ReviewProviderValue | null>(null);

export function ReviewProvider({
    children,
    initialUsers,
    initialReviews,
    initialWatchlist
}: ReviewProviderProps) {
    const [users, setUsers] = useState<User[]>(() => initialUsers.map(toAppUser));
    const [reviews, setReviews] = useState<Review[]>(() => initialReviews.map(toAppReview));
    const [watchlist, setWatchlist] = useState<Movie[]>(() =>
        initialWatchlist.map((item) => ({
            id: item.tmdbId,
            title: item.title,
            poster_path: item.posterPath,
            release_date: "",
            genres: item.genres
        }))
    );

    // Filmes são derivados das reviews (cada review tem título, poster, gêneros)
    const movies = useMemo<Movie[]>(() => {
        const movieMap = new Map<string, Movie>();
        reviews.forEach((review) => {
            const dbReview = initialReviews.find((r) => r.id === review.id);
            if (dbReview) {
                const movie = toMovieFromReview(dbReview);
                if (!movieMap.has(movie.id)) movieMap.set(movie.id, movie);
            }
        });
        return Array.from(movieMap.values());
    }, [reviews, initialReviews]);

    const addEntry = useCallback((entry: {
        movie: Movie;
        dateWatched: string;
        ratingUser1: number;
        ratingUser2: number;
        textReview: string;
        recommendedBy: string;
    }) => {
        void (async () => {
            const dbReview = await addMovieReview({
                tmdbId: entry.movie.id,
                title: entry.movie.title,
                posterPath: entry.movie.poster_path,
                dateWatched: entry.dateWatched,
                ratingUser1: entry.ratingUser1,
                ratingUser2: entry.ratingUser2,
                textReview: entry.textReview,
                genres: entry.movie.genres,
                recommendedById: entry.recommendedBy
            });

            setReviews((prev) => [toAppReview(dbReview), ...prev]);
            setWatchlist((prev) => prev.filter((m) => m.id !== dbReview.tmdbId));
        })();
    }, []);

    const updateUserHandler = useCallback((updated: User) => {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }, []);

    const addToWatchlistHandler = useCallback((movie: Movie) => {
        void (async () => {
            await addToWatchlist({
                tmdbId: movie.id,
                title: movie.title,
                posterPath: movie.poster_path,
                genres: movie.genres
            });

            setWatchlist((prev) => {
                if (prev.some((m) => m.id === movie.id)) return prev;
                return [movie, ...prev];
            });
        })();
    }, []);

    const updateEntryHandler = useCallback((id: string, entry: {
        movie: Movie;
        dateWatched: string;
        ratingUser1: number;
        ratingUser2: number;
        textReview: string;
        recommendedBy: string;
    }) => {
        void (async () => {
            const dbReview = await updateMovieReview(id, {
                tmdbId: entry.movie.id,
                title: entry.movie.title,
                posterPath: entry.movie.poster_path,
                dateWatched: entry.dateWatched,
                ratingUser1: entry.ratingUser1,
                ratingUser2: entry.ratingUser2,
                textReview: entry.textReview,
                genres: entry.movie.genres,
                recommendedById: entry.recommendedBy
            });

            setReviews((prev) =>
                prev.map((r) => (r.id === id ? toAppReview(dbReview) : r))
            );
        })();
    }, []);

    const deleteEntryHandler = useCallback((id: string) => {
        void (async () => {
            await deleteMovieReview(id);
            setReviews((prev) => prev.filter((r) => r.id !== id));
        })();
    }, []);

    const removeFromWatchlistHandler = useCallback((id: string) => {
        void (async () => {
            await removeFromWatchlist(id);
            setWatchlist((prev) => prev.filter((m) => m.id !== id));
        })();
    }, []);


    return (
        <ReviewContext.Provider
            value={{
                users,
                movies,
                reviews,
                watchlist,
                updateUser: updateUserHandler,
                addEntry,
                updateEntry: updateEntryHandler,
                deleteEntry: deleteEntryHandler,
                addToWatchlist: addToWatchlistHandler,
                removeFromWatchlist: removeFromWatchlistHandler
            }}
        >
            {children}
        </ReviewContext.Provider>
    );
}


export function useReviews(): ReviewProviderValue {
    const ctx = useContext(ReviewContext);
    if (!ctx) {
        throw new Error("useReviews deve ser usado dentro de <ReviewProvider>");
    }
    return ctx;
}