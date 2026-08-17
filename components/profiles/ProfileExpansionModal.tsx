"use client";

import { ChevronRight, UserCheck } from "lucide-react";
import Image from "next/image";
import type { Movie, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { StarRating } from "@/components/ui/StarRating";

export type ProfileExpansionType = "favorites" | "disappointments" | "recommendations";

interface ProfileExpansionItem {
    movie: Movie;
    rating: number;
    otherRating?: number;
    recommender?: User;
    dateWatched?: string;
}

interface ProfileExpansionModalProps {
    open: boolean;
    onClose: () => void;
    type: ProfileExpansionType | null;
    items: ProfileExpansionItem[];
    userName: string;
    otherUser: User;
}

const config: Record<ProfileExpansionType, { title: string; empty: string }> = {
    favorites: {
        title: "Todos os Favoritos",
        empty: "Nenhum filme avaliado com nota ≥ 4 ainda."
    },
    disappointments: {
        title: "Todas as Decepções",
        empty: "Nenhum filme avaliado com nota ≤ 2.5 ainda."
    },
    recommendations: {
        title: "Todas as Indicações",
        empty: "Nenhuma indicação feita ainda."
    }
};

export function ProfileExpansionModal({
    open,
    onClose,
    type,
    items,
    userName,
    otherUser
}: ProfileExpansionModalProps) {
    const current = type ? config[type] : null;

    return (
        <Modal open={open} onClose={onClose}>
            <div className="max-h-[80vh] overflow-y-auto p-6 sm:p-8 animate-slideUp">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {current?.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {userName}
                </p>

                {items.length === 0 ? (
                    <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                        {current?.empty}
                    </div>
                ) : (
                    <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {items.map(({ movie, rating, otherRating, recommender, dateWatched }) => (
                            <li key={movie.id} className="group">
                                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                                    {movie.poster_path ? (
                                        <Image
                                            src={getPosterUrl(movie.poster_path, "w342")}
                                            alt={movie.title}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-full items-center justify-center p-2 text-center text-[10px] text-gray-400">
                                            Sem capa
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1.5 line-clamp-1 text-xs font-medium text-gray-900 dark:text-gray-100">
                                    {movie.title}
                                </p>

                                {type === "recommendations" && recommender && (
                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                                        <UserCheck size={10} />
                                        Indicado por {recommender.name.split(" ")[0]}
                                    </div>
                                )}
                                {type === "recommendations" && dateWatched && (
                                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                                        {formatDate(dateWatched)}
                                    </p>
                                )}

                                <div className="mt-1 flex items-center gap-1.5">
                                    <StarRating rating={rating} size={12} />
                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                        {rating.toFixed(1).replace(".", ",")}
                                    </span>
                                </div>
                                {type === "recommendations" && otherRating !== undefined && (
                                    <div className="mt-0.5 flex items-center gap-1">
                                        <Avatar
                                            src={otherUser.avatar}
                                            name={otherUser.name}
                                            size="sm"
                                            className="h-3.5 w-3.5 text-[6px]"
                                        />
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                            {otherUser.name.split(" ")[0]} deu
                                        </span>
                                        <StarRating rating={otherRating} size={10} />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Fechar
                        <ChevronRight size={14} className="rotate-90" />
                    </button>
                </div>
            </div>
        </Modal>
    );
}