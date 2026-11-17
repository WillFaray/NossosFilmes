export type MediaType = "movie" | "tv";

export interface User {
    id: string;
    name: string;
    avatar: string;
}

export interface TvSeason {
    id: number;
    name: string;
    overview: string;
    poster_path: string;
    season_number: number;
    episode_count: number;
    air_date?: string | null;
}

export interface Movie {
    id: string;
    title: string;
    poster_path: string;
    release_date: string;
    genres: string[];
    overview?: string;
    runtime?: number;
    addedBy?: string;
    // Extended TV / Series fields
    name?: string;
    mediaType?: MediaType | string;
    backdrop_path?: string | null;
    first_air_date?: string;
    numberOfSeasons?: number;
    numberOfEpisodes?: number;
    runtimePerEpisode?: number;
    seasons?: TvSeason[];
}

export interface TvShow extends Movie {
    mediaType: "tv";
    name: string;
    first_air_date: string;
    numberOfSeasons?: number;
    numberOfEpisodes?: number;
    runtimePerEpisode?: number;
    seasons?: TvSeason[];
}

// Alias for polymorphic media item
export type MediaItem = Movie;

export interface Review {
    id: string;
    movieId: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    recommendedBy: string;
    platform?: string;
    runtime?: number;
    overview?: string;
    releaseDate?: string;
    // Extended TV / Series fields
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

export interface HistoryEntry {
    review: Review;
    movie: Movie;
    recommender: User;
    sessionNumber: number;
    totalSessions: number;
    isRewatch: boolean;
}

/* ------------------------------------------------------------------ */
/* Database & Persistence Types                                       */
/* ------------------------------------------------------------------ */

export interface DbUser {
    id: string;
    name: string;
    avatarUrl: string;
}

export interface DbMovieReview {
    id: string;
    tmdbId: string;
    title: string;
    posterPath: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    genres: string[];
    recommendedById: string;
    platform?: string | null;
    runtime?: number | null;
    releaseDate?: string | null;
    overview?: string | null;
    mediaType?: MediaType | string;
    seasonNumber?: number | null;
    seasonName?: string | null;
    totalEpisodes?: number | null;
    episodesWatched?: number | null;
    runtimePerEpisode?: number | null;
    watchedDates?: string | null;
    status?: "completed" | "abandoned" | string;
    abandonedReason?: string | null;
    seriesProgressId?: string | null;
}

export interface DbWatchlistItem {
    id: string;
    tmdbId: string;
    title: string;
    posterPath: string;
    genres: string[];
    runtime?: number | null;
    releaseDate?: string | null;
    overview?: string | null;
    addedById?: string;
    mediaType?: MediaType | string;
    numberOfSeasons?: number | null;
    numberOfEpisodes?: number | null;
}

export interface DbSeriesCheckin {
    id: string;
    seriesProgressId: string;
    dateWatched: string;
    episodeStart: number;
    episodeEnd: number;
    episodeTag: string;
    createdAt: Date | string;
}

export interface DbSeriesProgress {
    id: string;
    tmdbId: string;
    title: string;
    posterPath: string;
    backdropPath?: string | null;
    genres: string[];
    overview?: string | null;
    firstAirDate?: string | null;
    seasonNumber: number;
    seasonName: string;
    totalEpisodes: number;
    currentEpisode: number;
    runtimePerEpisode?: number | null;
    platform?: string | null;
    status: "watching" | "completed" | "abandoned" | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface DbSeriesProgressWithCheckins extends DbSeriesProgress {
    checkins: DbSeriesCheckin[];
}

/* ------------------------------------------------------------------ */
/* Action Inputs                                                      */
/* ------------------------------------------------------------------ */

export interface AddSeriesProgressInput {
    tmdbId: string;
    title: string;
    posterPath?: string;
    backdropPath?: string | null;
    genres?: string[];
    overview?: string | null;
    firstAirDate?: string | null;
    seasonNumber?: number;
    seasonName?: string;
    totalEpisodes: number;
    currentEpisode?: number;
    runtimePerEpisode?: number | null;
    platform?: string | null;
    status?: "watching" | "completed" | "abandoned";
    removeFromWatchlist?: boolean;
}

export interface AddSeriesCheckinInput {
    seriesProgressId: string;
    dateWatched: string;
    episodeStart: number;
    episodeEnd: number;
    episodeTag?: string;
}

export interface AbandonSeriesInput {
    ratingUser1?: number;
    ratingUser2?: number;
    textReview?: string;
    abandonedReason: string;
    recommendedById?: string;
    episodesWatched?: number;
    totalEpisodes?: number;
    dateWatched?: string;
    platform?: string;
}

export interface CompleteSeriesInput {
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    recommendedById: string;
    platform?: string;
    watchedDates?: string[];
    dateWatched?: string;
    runtimePerEpisode?: number;
    totalEpisodes?: number;
    episodesWatched?: number;
    removeFromWatchlist?: boolean;
}

export interface MovieReviewInput {
    tmdbId: string;
    title: string;
    posterPath: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    genres: string[];
    recommendedById: string;
    platform?: string;
    runtime?: number;
    releaseDate?: string;
    overview?: string;
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

/* ------------------------------------------------------------------ */
/* Calendar Unified Session Item                                      */
/* ------------------------------------------------------------------ */

export interface CalendarSessionItem {
    id: string;
    dateWatched: string;
    mediaType: MediaType | string;
    title: string;
    posterPath: string;
    sessionTag?: string;
    review?: Review;
    checkin?: DbSeriesCheckin;
    seriesProgress?: DbSeriesProgress;
}
