"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import Image from "next/image";
import type { Movie, Review, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { ReviewDetailModal } from "./ReviewDetailModal";

interface HistoryListViewProps {
    entries: {
        review: Review;
        movie: Movie;
        recommender: User;
    }[];
    user1: User;
    user2: User;
}

export function HistoryListView({ entries, user1, user2 }: HistoryListViewProps) {
    const { users, updateEntry, deleteEntry } = useReviews();
    const [selectedEntry, setSelectedEntry] = useState<HistoryListViewProps["entries"][number] | null>(null);

    return (
        <>
            <ul className="space-y-3">
                {entries.map(({ review, movie, recommender }) => (
                    <li key={review.id} className="group">
                        <button
                            type="button"
                            onClick={() => setSelectedEntry({ review, movie, recommender })}
                            className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50"
                            aria-label={`Ver detalhes de ${movie.title}`}
                        >
                            {/* Thumbnail */}
                            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200 shadow-sm dark:bg-gray-800">
                                {movie.poster_path ? (
                                    <Image
                                        src={getPosterUrl(movie.poster_path, "w342")}
                                        alt={movie.title}
                                        fill
                                        sizes="56px"
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center p-1 text-center text-[9px] leading-tight text-gray-400">
                                        Sem capa
                                    </span>
                                )}
                            </div>

                            {/* Informações */}
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {movie.title}
                                </h3>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <CalendarDays size={12} />
                                    {formatDate(review.dateWatched)}
                                </p>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    <Avatar src={recommender.avatar} name={recommender.name} size="sm" className="h-5 w-5 text-[8px]" />
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        Indicou
                                    </span>
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="hidden flex-col items-end gap-2 sm:flex">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                        {user1.name.split(" ")[0]}
                                    </span>
                                    <StarRating rating={review.ratingUser1} size={13} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                        {user2.name.split(" ")[0]}
                                    </span>
                                    <StarRating rating={review.ratingUser2} size={13} />
                                </div>
                            </div>

                            {/* Indicador de mais opções */}
                            <div className="shrink-0 pl-1 text-gray-300 transition-colors group-hover:text-indigo-400 dark:text-gray-600 dark:group-hover:text-indigo-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                </svg>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>

            {/* Modal de detalhes */}
            <ReviewDetailModal
                open={Boolean(selectedEntry)}
                onClose={() => setSelectedEntry(null)}
                entry={selectedEntry}
                user1={user1}
                user2={user2}
                users={users}
                onEdit={updateEntry}
                onDelete={deleteEntry}
            />
        </>
    );
}