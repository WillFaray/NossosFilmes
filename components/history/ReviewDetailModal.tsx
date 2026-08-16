"use client";

import { CalendarDays, UserCheck } from "lucide-react";
import Image from "next/image";
import type { Movie, Review, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { StarRating } from "@/components/ui/StarRating";

interface ReviewDetailModalProps {
    open: boolean;
    onClose: () => void;
    entry: {
        review: Review;
        movie: Movie;
        recommender: User;
    } | null;
    user1: User;
    user2: User;
}

export function ReviewDetailModal({ open, onClose, entry, user1, user2 }: ReviewDetailModalProps) {
    return (
        <Modal open={open} onClose={onClose}>
            {entry && (
                <div className="flex max-h-[80vh] flex-col sm:flex-row animate-slideUp">
                    {/* Poster */}
                    <div className="relative aspect-[2/3] w-full shrink-0 sm:h-auto sm:w-44">
                        {entry.movie.poster_path ? (
                            <Image
                                src={getPosterUrl(entry.movie.poster_path, "w342")}
                                alt={entry.movie.title}
                                fill
                                sizes="176px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-400 dark:bg-gray-800">
                                Sem capa
                            </div>
                        )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {entry.movie.title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {entry.movie.genres.join(" · ")}
                        </p>

                        <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <CalendarDays size={14} className="text-gray-400" />
                            Assistido em {formatDate(entry.review.dateWatched)}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Avatar
                                src={entry.recommender.avatar}
                                name={entry.recommender.name}
                                size="sm"
                                className="h-6 w-6 text-[9px]"
                            />
                            <UserCheck size={14} className="text-gray-400" />
                            Recomendado por {entry.recommender.name}
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {entry.review.textReview}
                        </p>

                        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Avatar src={user1.avatar} name={user1.name} size="sm" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {user1.name}
                                    </span>
                                </div>
                                <StarRating rating={entry.review.ratingUser1} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Avatar src={user2.avatar} name={user2.name} size="sm" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        {user2.name}
                                    </span>
                                </div>
                                <StarRating rating={entry.review.ratingUser2} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}