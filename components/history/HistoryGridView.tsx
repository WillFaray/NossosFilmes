"use client";

import { useState } from "react";
import Image from "next/image";
import type { Movie, Review, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { ReviewDetailModal } from "./ReviewDetailModal";

interface HistoryGridViewProps {
    entries: {
        review: Review;
        movie: Movie;
        recommender: User;
    }[];
    user1: User;
    user2: User;
}

export function HistoryGridView({ entries, user1, user2 }: HistoryGridViewProps) {
    const [selectedEntry, setSelectedEntry] = useState<HistoryGridViewProps["entries"][number] | null>(null);

    return (
        <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
                {entries.map(({ review, movie, recommender }) => (
                    <li key={review.id} className="group">
                        <button
                            type="button"
                            onClick={() => setSelectedEntry({ review, movie, recommender })}
                            className="relative block aspect-[2/3] w-full overflow-hidden rounded-2xl bg-gray-200 shadow-sm ring-1 ring-gray-200 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-gray-800 dark:ring-gray-800 dark:group-hover:ring-indigo-500/50"
                            aria-label={`Ver detalhes de ${movie.title}`}
                        >
                            {movie.poster_path ? (
                                <Image
                                    src={getPosterUrl(movie.poster_path)}
                                    alt={movie.title}
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <span className="flex h-full items-center justify-center p-4 text-center text-xs text-gray-400">
                                    Sem capa
                                </span>
                            )}
                        </button>
                        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(review.dateWatched)}
                        </p>
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
            />
        </>
    );
}