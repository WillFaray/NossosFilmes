"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import type { HistoryEntry, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { ReviewDetailModal } from "./ReviewDetailModal";

interface HistoryGridViewProps {
    entries: HistoryEntry[];
    user1: User;
    user2: User;
}

export function HistoryGridView({ entries, user1, user2 }: HistoryGridViewProps) {
    const { users, updateEntry, deleteEntry } = useReviews();
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

    const activeEntry = useMemo(() => {
        if (!selectedEntry) return null;
        return entries.find((e) => e.review.id === selectedEntry.review.id) ?? selectedEntry;
    }, [entries, selectedEntry]);

    return (
        <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
                {entries.map((entry) => {
                    const { review, movie, isRewatch, sessionNumber } = entry;
                    return (
                        <li key={review.id} className="group">
                            <button
                                type="button"
                                onClick={() => setSelectedEntry(entry)}
                                className="relative block aspect-[2/3] w-full overflow-hidden rounded-2xl bg-gray-200 shadow-sm ring-1 ring-gray-200 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-gray-800 dark:ring-gray-800 dark:group-hover:ring-indigo-500/50"
                                aria-label={`Ver detalhes de ${movie.title}`}
                            >
                                {isRewatch && (
                                    <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-purple-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md backdrop-blur-sm">
                                        <RotateCcw size={10} />
                                        {sessionNumber}ª vez
                                    </div>
                                )}
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
                    );
                })}
            </ul>

            {/* Modal de detalhes */}
            <ReviewDetailModal
                open={Boolean(activeEntry)}
                onClose={() => setSelectedEntry(null)}
                entry={activeEntry}
                user1={user1}
                user2={user2}
                users={users}
                onEdit={updateEntry}
                onDelete={deleteEntry}
            />
        </>
    );
}
