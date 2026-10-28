export interface User {
    id: string;
    name: string;
    avatar: string;
}

export interface Movie {
    id: string;
    title: string;
    poster_path: string;
    release_date: string;
    genres: string[];
    overview?: string;
    runtime?: number;
}

export interface Review {
    id: string;
    movieId: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    recommendedBy: string;
    platform?: string;
}

export interface HistoryEntry {
    review: Review;
    movie: Movie;
    recommender: User;
    sessionNumber: number;
    totalSessions: number;
    isRewatch: boolean;
}
