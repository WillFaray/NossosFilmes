"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
    AbandonSeriesInput,
    AddSeriesCheckinInput,
    AddSeriesProgressInput,
    CompleteSeriesInput,
    DbMovieReview,
    DbSeriesCheckin,
    DbSeriesProgress,
    DbSeriesProgressWithCheckins,
    DbUser,
    DbWatchlistItem,
    MediaType,
    Movie,
    Review,
    User
} from "@/types";
import {
    abandonSeriesProgress,
    addMovieReview,
    addSeriesCheckin,
    addSeriesProgress,
    addToWatchlist,
    completeSeriesProgress,
    deleteMovieReview,
    deleteSeriesProgress,
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
    removeFromWatchlist?: boolean;
    mediaType?: MediaType | string;
    seasonNumber?: number | null;
    seasonName?: string | null;
    totalEpisodes?: number | null;
    episodesWatched?: number | null;
    runtimePerEpisode?: number | null;
    watchedDates?: string[] | string | null;
    status?: "completed" | "abandoned" | string;
    abandonedReason?: string | null;
    seriesProgressId?: string | null;
}

interface ReviewProviderValue {
    users: User[];
    movies: Movie[];
    reviews: Review[];
    watchlist: Movie[];
    seriesProgress: DbSeriesProgressWithCheckins[];
    allSeriesProgress: DbSeriesProgressWithCheckins[];
    updateUser: (updated: User) => void;
    addEntry: (entry: EntryInput) => Promise<void>;
    updateEntry: (id: string, entry: EntryInput) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    addToWatchlist: (movie: Movie, addedById?: string) => Promise<void>;
    removeFromWatchlist: (id: string) => Promise<void>;
    startSeriesProgress: (input: AddSeriesProgressInput) => Promise<DbSeriesProgress>;
    checkinSeries: (input: AddSeriesCheckinInput) => Promise<DbSeriesCheckin>;
    cancelSeriesProgress: (id: string) => Promise<void>;
    abandonSeries: (id: string, input: AbandonSeriesInput) => Promise<void>;
    completeSeries: (id: string, input: CompleteSeriesInput) => Promise<void>;
}

interface ReviewProviderProps {
    children: React.ReactNode;
    initialUsers: DbUser[];
    initialReviews: DbMovieReview[];
    initialWatchlist: DbWatchlistItem[];
    initialSeriesProgress?: DbSeriesProgressWithCheckins[];
}

const ReviewContext = createContext<ReviewProviderValue | null>(null);

function toWatchlistMovie(item: DbWatchlistItem): Movie {
    return {
        id: item.tmdbId,
        title: item.title,
        poster_path: item.posterPath,
        release_date: item.releaseDate ?? "",
        overview: item.overview ?? undefined,
        runtime: item.runtime ?? undefined,
        addedBy: item.addedById ?? undefined,
        genres: item.genres,
        mediaType: item.mediaType ?? "movie",
        numberOfSeasons: item.numberOfSeasons ?? undefined,
        numberOfEpisodes: item.numberOfEpisodes ?? undefined
    };
}

export function ReviewProvider({
    children,
    initialUsers,
    initialReviews,
    initialWatchlist,
    initialSeriesProgress = []
}: ReviewProviderProps) {
    const [users, setUsers] = useState<User[]>(() => initialUsers.map(toAppUser));
    const [reviews, setReviews] = useState<Review[]>(() => initialReviews.map(toAppReview));
    const [watchlist, setWatchlist] = useState<Movie[]>(() =>
        initialWatchlist.map(toWatchlistMovie)
    );
    const [allSeriesProgress, setAllSeriesProgress] = useState<DbSeriesProgressWithCheckins[]>(
        () => initialSeriesProgress
    );

    const [movieData, setMovieData] = useState<Map<string, Movie>>(() => {
        const map = new Map<string, Movie>();
        initialReviews.forEach((review) => {
            const movie = toMovieFromReview(review);
            map.set(movie.id, movie);
        });
        return map;
    });

    const [persistError, setPersistError] = useState<string | null>(null);

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
        setWatchlist(initialWatchlist.map(toWatchlistMovie));
    }, [initialWatchlist]);

    useEffect(() => {
        setAllSeriesProgress(initialSeriesProgress);
    }, [initialSeriesProgress]);

    const seriesProgress = useMemo(
        () => allSeriesProgress.filter((s) => s.status === "watching"),
        [allSeriesProgress]
    );

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
            const shouldRemove = entry.removeFromWatchlist !== false;
            const mediaType = entry.mediaType || entry.movie.mediaType || "movie";
            const totalEpisodes = entry.totalEpisodes ?? entry.movie.numberOfEpisodes ?? null;
            const episodesWatched = entry.episodesWatched ?? totalEpisodes;
            const runtimePerEpisode = entry.runtimePerEpisode ?? entry.movie.runtimePerEpisode ?? null;
            const computedRuntime =
                mediaType === "tv" && episodesWatched && runtimePerEpisode
                    ? episodesWatched * runtimePerEpisode
                    : entry.movie.runtime;

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
                runtime: computedRuntime,
                releaseDate: entry.movie.release_date,
                overview: entry.movie.overview,
                recommendedById: entry.recommendedBy,
                removeFromWatchlist: shouldRemove,
                mediaType,
                seasonNumber: entry.seasonNumber ?? null,
                seasonName: entry.seasonName ?? null,
                totalEpisodes,
                episodesWatched,
                runtimePerEpisode,
                watchedDates: entry.watchedDates ?? null,
                status: entry.status ?? "completed",
                abandonedReason: entry.abandonedReason ?? null,
                seriesProgressId: entry.seriesProgressId ?? null
            });

            upsertMovieData(toMovieFromReview(dbReview));
            setReviews((prev) => [
                toAppReview(dbReview),
                ...prev.filter((r) => r.id !== dbReview.id)
            ]);
            if (shouldRemove) {
                setWatchlist((prev) => prev.filter((m) => m.id !== dbReview.tmdbId));
            }
            if (entry.seriesProgressId) {
                setAllSeriesProgress((prev) =>
                    prev.map((sp) =>
                        sp.id === entry.seriesProgressId
                            ? {
                                  ...sp,
                                  status: entry.status === "abandoned" ? "abandoned" : "completed",
                                  currentEpisode: episodesWatched ?? sp.currentEpisode
                              }
                            : sp
                    )
                );
            }
        } catch (error) {
            console.error("Erro ao salvar registro:", error);
            reportError("Não foi possível salvar o registro. Tente novamente.");
            throw error;
        }
    }, [reportError, upsertMovieData]);

    const updateUserHandler = useCallback((updated: User) => {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }, []);

    const addToWatchlistHandler = useCallback(async (movie: Movie, addedById?: string) => {
        try {
            let enrichedMovie = movie;
            const isTv = movie.mediaType === "tv";
            if (!enrichedMovie.runtime && !isTv) {
                try {
                    const res = await fetch(`/api/movies/${movie.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.movie) {
                            enrichedMovie = {
                                ...movie,
                                runtime: data.movie.runtime ?? movie.runtime,
                                overview: data.movie.overview || movie.overview
                            };
                        }
                    }
                } catch {
                    // Continua com os dados básicos caso a consulta extra falhe
                }
            } else if (isTv && (!enrichedMovie.numberOfSeasons || !enrichedMovie.runtime)) {
                try {
                    const res = await fetch(`/api/tv/${movie.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        const tv = data.tv || data.movie;
                        if (tv) {
                            enrichedMovie = {
                                ...movie,
                                runtime: tv.runtimePerEpisode ?? tv.runtime ?? movie.runtime,
                                overview: tv.overview || movie.overview,
                                numberOfSeasons: tv.numberOfSeasons ?? movie.numberOfSeasons,
                                numberOfEpisodes: tv.numberOfEpisodes ?? movie.numberOfEpisodes
                            };
                        }
                    }
                } catch {
                    // Continua com os dados básicos caso a consulta extra falhe
                }
            }

            const created = await addToWatchlist({
                tmdbId: enrichedMovie.id,
                title: enrichedMovie.title || enrichedMovie.name || "Obra",
                posterPath: enrichedMovie.poster_path,
                genres: enrichedMovie.genres,
                runtime: enrichedMovie.runtime,
                releaseDate: enrichedMovie.release_date || enrichedMovie.first_air_date,
                overview: enrichedMovie.overview,
                addedById,
                mediaType: isTv ? "tv" : "movie",
                numberOfSeasons: enrichedMovie.numberOfSeasons,
                numberOfEpisodes: enrichedMovie.numberOfEpisodes
            });

            const watchlistMovie = toWatchlistMovie(created);
            setWatchlist((prev) => {
                if (prev.some((m) => m.id === watchlistMovie.id)) return prev;
                return [watchlistMovie, ...prev];
            });
        } catch (error) {
            console.error("Erro ao adicionar à lista de interesse:", error);
            reportError(`Não foi possível adicionar "${movie.title}" à lista.`);
            throw error;
        }
    }, [reportError]);

    const updateEntryHandler = useCallback(async (id: string, entry: EntryInput) => {
        try {
            const mediaType = entry.mediaType || entry.movie.mediaType || "movie";
            const totalEpisodes = entry.totalEpisodes ?? entry.movie.numberOfEpisodes ?? null;
            const episodesWatched = entry.episodesWatched ?? totalEpisodes;
            const runtimePerEpisode = entry.runtimePerEpisode ?? entry.movie.runtimePerEpisode ?? null;
            const computedRuntime =
                mediaType === "tv" && episodesWatched && runtimePerEpisode
                    ? episodesWatched * runtimePerEpisode
                    : entry.movie.runtime;

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
                runtime: computedRuntime,
                releaseDate: entry.movie.release_date,
                overview: entry.movie.overview,
                recommendedById: entry.recommendedBy,
                mediaType,
                seasonNumber: entry.seasonNumber ?? null,
                seasonName: entry.seasonName ?? null,
                totalEpisodes,
                episodesWatched,
                runtimePerEpisode,
                watchedDates: entry.watchedDates ?? null,
                status: entry.status ?? "completed",
                abandonedReason: entry.abandonedReason ?? null,
                seriesProgressId: entry.seriesProgressId ?? null
            });

            upsertMovieData(toMovieFromReview(dbReview));
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
            reportError("Não foi possível remover o item da lista.");
            throw error;
        }
    }, [reportError]);

    const startSeriesProgressHandler = useCallback(
        async (input: AddSeriesProgressInput) => {
            try {
                const created = await addSeriesProgress(input);
                const withCheckins: DbSeriesProgressWithCheckins = {
                    ...created,
                    checkins: []
                };
                setAllSeriesProgress((prev) => [
                    withCheckins,
                    ...prev.filter((s) => s.id !== created.id)
                ]);
                if (input.removeFromWatchlist !== false) {
                    setWatchlist((prev) => prev.filter((m) => m.id !== created.tmdbId));
                }
                return created;
            } catch (error) {
                console.error("Erro ao iniciar série em andamento:", error);
                reportError("Não foi possível iniciar o acompanhamento da série.");
                throw error;
            }
        },
        [reportError]
    );

    const checkinSeriesHandler = useCallback(
        async (input: AddSeriesCheckinInput) => {
            try {
                const checkin = await addSeriesCheckin(input);
                setAllSeriesProgress((prev) =>
                    prev.map((sp) => {
                        if (sp.id !== input.seriesProgressId) return sp;
                        const updatedCurrent = Math.max(sp.currentEpisode, checkin.episodeEnd);
                        const updatedCheckins = [
                            checkin,
                            ...sp.checkins.filter((c) => c.id !== checkin.id)
                        ].sort((a, b) => b.dateWatched.localeCompare(a.dateWatched));
                        return {
                            ...sp,
                            currentEpisode: updatedCurrent,
                            updatedAt: new Date().toISOString(),
                            checkins: updatedCheckins
                        };
                    })
                );
                return checkin;
            } catch (error) {
                console.error("Erro ao registrar check-in da série:", error);
                const msg =
                    error instanceof Error
                        ? error.message
                        : "Não foi possível registrar os episódios assistidos.";
                reportError(msg);
                throw error;
            }
        },
        [reportError]
    );

    const cancelSeriesProgressHandler = useCallback(
        async (id: string) => {
            try {
                await deleteSeriesProgress(id);
                setAllSeriesProgress((prev) => prev.filter((sp) => sp.id !== id));
            } catch (error) {
                console.error("Erro ao cancelar série em andamento:", error);
                reportError("Não foi possível remover a série em andamento.");
                throw error;
            }
        },
        [reportError]
    );

    const abandonSeriesHandler = useCallback(
        async (id: string, input: AbandonSeriesInput) => {
            try {
                const dbReview = await abandonSeriesProgress(id, input);
                upsertMovieData(toMovieFromReview(dbReview));
                setReviews((prev) => [
                    toAppReview(dbReview),
                    ...prev.filter((r) => r.id !== dbReview.id)
                ]);
                setAllSeriesProgress((prev) =>
                    prev.map((sp) =>
                        sp.id === id
                            ? {
                                  ...sp,
                                  status: "abandoned",
                                  currentEpisode: dbReview.episodesWatched ?? sp.currentEpisode
                              }
                            : sp
                    )
                );
            } catch (error) {
                console.error("Erro ao abandonar série:", error);
                reportError("Não foi possível registrar o abandono da série.");
                throw error;
            }
        },
        [reportError, upsertMovieData]
    );

    const completeSeriesHandler = useCallback(
        async (id: string, input: CompleteSeriesInput) => {
            try {
                const dbReview = await completeSeriesProgress(id, input);
                upsertMovieData(toMovieFromReview(dbReview));
                setReviews((prev) => [
                    toAppReview(dbReview),
                    ...prev.filter((r) => r.id !== dbReview.id)
                ]);
                if (input.removeFromWatchlist !== false) {
                    setWatchlist((prev) => prev.filter((m) => m.id !== dbReview.tmdbId));
                }
                setAllSeriesProgress((prev) =>
                    prev.map((sp) =>
                        sp.id === id
                            ? {
                                  ...sp,
                                  status: "completed",
                                  currentEpisode: dbReview.episodesWatched ?? sp.totalEpisodes
                              }
                            : sp
                    )
                );
            } catch (error) {
                console.error("Erro ao concluir temporada:", error);
                reportError("Não foi possível salvar a avaliação da temporada.");
                throw error;
            }
        },
        [reportError, upsertMovieData]
    );

    const contextValue = useMemo<ReviewProviderValue>(() => ({
        users,
        movies,
        reviews,
        watchlist,
        seriesProgress,
        allSeriesProgress,
        updateUser: updateUserHandler,
        addEntry,
        updateEntry: updateEntryHandler,
        deleteEntry: deleteEntryHandler,
        addToWatchlist: addToWatchlistHandler,
        removeFromWatchlist: removeFromWatchlistHandler,
        startSeriesProgress: startSeriesProgressHandler,
        checkinSeries: checkinSeriesHandler,
        cancelSeriesProgress: cancelSeriesProgressHandler,
        abandonSeries: abandonSeriesHandler,
        completeSeries: completeSeriesHandler
    }), [
        users,
        movies,
        reviews,
        watchlist,
        seriesProgress,
        allSeriesProgress,
        updateUserHandler,
        addEntry,
        updateEntryHandler,
        deleteEntryHandler,
        addToWatchlistHandler,
        removeFromWatchlistHandler,
        startSeriesProgressHandler,
        checkinSeriesHandler,
        cancelSeriesProgressHandler,
        abandonSeriesHandler,
        completeSeriesHandler
    ]);

    return (
        <ReviewContext.Provider value={contextValue}>
            {children}
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
