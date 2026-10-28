"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { Toast } from "@/components/ui/Toast";

export interface EntryInput {
    movie: Movie;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    recommendedBy: string;
    platform?: string;
}

interface ReviewProviderValue {
    users: User[];
    movies: Movie[];
    reviews: Review[];
    watchlist: Movie[];
    updateUser: (updated: User) => void;
    addEntry: (entry: EntryInput) => Promise<void>;
    updateEntry: (id: string, entry: EntryInput) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    addToWatchlist: (movie: Movie) => Promise<void>;
    removeFromWatchlist: (id: string) => Promise<void>;
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

    // Dados dos filmes (título, poster, gêneros) por tmdbId.
    // Mantido em estado para que filmes recém-adicionados apareçam
    // imediatamente no histórico, sem depender apenas de initialReviews.
    const [movieData, setMovieData] = useState<Map<string, Movie>>(() => {
        const map = new Map<string, Movie>();
        initialReviews.forEach((review) => {
            const movie = toMovieFromReview(review);
            map.set(movie.id, movie);
        });
        return map;
    });

    // Mensagem de erro de persistência exibida via Toast
    const [persistError, setPersistError] = useState<string | null>(null);

    // Sincroniza o estado quando os dados server-side mudam
    // (ex.: após uma importação seguida de router.refresh())
    useEffect(() => {
        setUsers(initialUsers.map(toAppUser));
    }, [initialUsers]);

    useEffect(() => {
        setReviews(initialReviews.map(toAppReview));
        const map = new Map<string, Movie>();
        initialReviews.forEach((review) => {
            const movie = toMovieFromReview(review);
            map.set(movie.id, movie);
        });
        setMovieData(map);
    }, [initialReviews]);

    useEffect(() => {
        setWatchlist(
            initialWatchlist.map((item) => ({
                id: item.tmdbId,
                title: item.title,
                poster_path: item.posterPath,
                release_date: "",
                genres: item.genres
            }))
        );
    }, [initialWatchlist]);

    const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const reportError = useCallback((message: string) => {
        setPersistError(message);
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => {
            setPersistError((current) => (current === message ? null : current));
        }, 5000);
    }, []);

    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        };
    }, []);

    // Filmes são derivados das reviews + dados de filme conhecidos
    const movies = useMemo<Movie[]>(() => {
        const seen = new Set<string>();
        const result: Movie[] = [];
        reviews.forEach((review) => {
            if (seen.has(review.movieId)) return;
            const movie = movieData.get(review.movieId);
            if (movie) {
                seen.add(review.movieId);
                result.push(movie);
            }
        });
        return result;
    }, [reviews, movieData]);

    const upsertMovieData = useCallback((movie: Movie) => {
        setMovieData((prev) => {
            const next = new Map(prev);
            next.set(movie.id, movie);
            return next;
        });
    }, []);

    const addEntry = useCallback(async (entry: EntryInput) => {
        try {
            const dbReview = await addMovieReview({
                tmdbId: entry.movie.id,
                title: entry.movie.title,
                posterPath: entry.movie.poster_path,
                dateWatched: entry.dateWatched,
                ratingUser1: entry.ratingUser1,
                ratingUser2: entry.ratingUser2,
                textReview: entry.textReview,
                genres: entry.movie.genres,
                platform: entry.platform,
                recommendedById: entry.recommendedBy
            });

            upsertMovieData(entry.movie);
            setReviews((prev) => [
                toAppReview(dbReview),
                ...prev.filter((r) => r.id !== dbReview.id)
            ]);
            setWatchlist((prev) => prev.filter((m) => m.id !== dbReview.tmdbId));
        } catch (error) {
            console.error("Erro ao salvar registro:", error);
            reportError("Não foi possível salvar o registro. Tente novamente.");
            throw error;
        }
    }, [reportError, upsertMovieData]);

    const updateUserHandler = useCallback((updated: User) => {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }, []);

    const addToWatchlistHandler = useCallback(async (movie: Movie) => {
        try {
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
        } catch (error) {
            console.error("Erro ao adicionar à lista de interesse:", error);
            reportError(`Não foi possível adicionar "${movie.title}" à lista.`);
            throw error;
        }
    }, [reportError]);

    const updateEntryHandler = useCallback(async (id: string, entry: EntryInput) => {
        try {
            const dbReview = await updateMovieReview(id, {
                tmdbId: entry.movie.id,
                title: entry.movie.title,
                posterPath: entry.movie.poster_path,
                dateWatched: entry.dateWatched,
                ratingUser1: entry.ratingUser1,
                ratingUser2: entry.ratingUser2,
                textReview: entry.textReview,
                genres: entry.movie.genres,
                platform: entry.platform,
                recommendedById: entry.recommendedBy
            });

            upsertMovieData(entry.movie);
            setReviews((prev) =>
                prev.map((r) => (r.id === id ? toAppReview(dbReview) : r))
            );
        } catch (error) {
            console.error("Erro ao atualizar registro:", error);
            reportError("Não foi possível atualizar o registro. Tente novamente.");
            throw error;
        }
    }, [reportError, upsertMovieData]);

    const deleteEntryHandler = useCallback(async (id: string) => {
        try {
            await deleteMovieReview(id);
            setReviews((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            console.error("Erro ao excluir registro:", error);
            reportError("Não foi possível excluir o registro. Tente novamente.");
            throw error;
        }
    }, [reportError]);

    const removeFromWatchlistHandler = useCallback(async (id: string) => {
        try {
            await removeFromWatchlist(id);
            setWatchlist((prev) => prev.filter((m) => m.id !== id));
        } catch (error) {
            console.error("Erro ao remover da lista de interesse:", error);
            reportError("Não foi possível remover o filme da lista.");
            throw error;
        }
    }, [reportError]);


    const contextValue = useMemo<ReviewProviderValue>(() => ({
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
    }), [
        users,
        movies,
        reviews,
        watchlist,
        updateUserHandler,
        addEntry,
        updateEntryHandler,
        deleteEntryHandler,
        addToWatchlistHandler,
        removeFromWatchlistHandler
    ]);

    return (
        <ReviewContext.Provider value={contextValue}>
            {children}
            {/* Erros globais de persistência */}
            <Toast
                open={Boolean(persistError)}
                message={persistError ?? ""}
                onClose={() => setPersistError(null)}
            />
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