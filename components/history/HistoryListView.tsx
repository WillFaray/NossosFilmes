"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import type { Movie, Review, User } from "@/types";
import { getPosterUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { EditReviewModal } from "./EditReviewModal";

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
    const [editing, setEditing] = useState<HistoryListViewProps["entries"][number] | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleDelete = (id: string) => {
        deleteEntry(id);
        setConfirmDeleteId(null);
    };

    return (
        <>
            <ul className="space-y-3">
                {entries.map(({ review, movie, recommender }) => (
                    <li
                        key={review.id}
                        className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md hover:ring-indigo-300 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50"
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
                                {new Date(review.dateWatched).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                })}
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

                        {/* Ações */}
                        <div className="flex shrink-0 flex-col items-center gap-1.5">
                            {confirmDeleteId === review.id ? (
                                <>
                                    <button
                                        onClick={() => handleDelete(review.id)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-500"
                                    >
                                        <Trash2 size={12} />
                                        Confirmar
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                    >
                                        Cancelar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setEditing({ review, movie, recommender })}
                                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                        aria-label={`Editar ${movie.title}`}
                                    >
                                        <Pencil size={12} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(review.id)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                        aria-label={`Excluir ${movie.title}`}
                                    >
                                        <Trash2 size={12} />
                                        Excluir
                                    </button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {/* Modal de edição */}
            {editing && (
                <EditReviewModal
                    open={Boolean(editing)}
                    onClose={() => setEditing(null)}
                    review={editing.review}
                    movie={editing.movie}
                    users={users}
                    onSave={updateEntry}
                />
            )}
        </>
    );
}
