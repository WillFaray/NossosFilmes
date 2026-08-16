"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Movie, Review } from "@/types";
import { movies as mockMovies, reviews as mockReviews } from "@/lib/mockData";

interface ReviewProviderValue {
    movies: Movie[];
    reviews: Review[];
    watchlist: Movie[];
    addEntry: (entry: {
        movie: Movie;
        dateWatched: string;
        ratingUser1: number;
        ratingUser2: number;
        textReview: string;
        recommendedBy: string;
    }) => void;
    addToWatchlist: (movie: Movie) => void;
}

const ReviewContext = createContext<ReviewProviderValue | null>(null);

export function ReviewProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<Movie[]>(mockMovies);
    const [reviews, setReviews] = useState<Review[]>(mockReviews);

    /** Filmes da watchlist = filmes conhecidos que ainda não têm review */
    const watchlist = useMemo(() => {
        const watchedIds = new Set(reviews.map((r) => r.movieId));
        return movies.filter((m) => !watchedIds.has(m.id));
    }, [movies, reviews]);

    const addEntry = useCallback((entry: {
        movie: Movie;
        dateWatched: string;
        ratingUser1: number;
        ratingUser2: number;
        textReview: string;
        recommendedBy: string;
    }) => {
        setMovies((prev) => {
            if (prev.some((m) => m.id === entry.movie.id)) return prev;
            return [...prev, entry.movie];
        });

        const newReview: Review = {
            id: `review-${Date.now()}`,
            movieId: entry.movie.id,
            dateWatched: entry.dateWatched,
            ratingUser1: entry.ratingUser1,
            ratingUser2: entry.ratingUser2,
            textReview: entry.textReview,
            recommendedBy: entry.recommendedBy
        };

        setReviews((prev) => [newReview, ...prev]);
    }, []);

    const addToWatchlist = useCallback((movie: Movie) => {
        setMovies((prev) => {
            if (prev.some((m) => m.id === movie.id)) return prev;
            return [...prev, movie];
        });
    }, []);

    return (
        <ReviewContext.Provider value={{ movies, reviews, watchlist, addEntry, addToWatchlist }}>
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