"use client";

import { useMemo, useState } from "react";
import {
    CalendarDays,
    Clock,
    ExternalLink,
    FlagOff,
    Loader2,
    Pencil,
    RotateCcw,
    Trash2,
    Tv,
    UserCheck
} from "lucide-react";
import Image from "next/image";
import type { HistoryEntry, User } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { formatDuration, getEntryDurationMinutes } from "@/lib/runtime";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { StarRating } from "@/components/ui/StarRating";
import { EditReviewModal } from "./EditReviewModal";
import type { EntryInput } from "@/components/reviews/ReviewProvider";

interface ReviewDetailModalProps {
    open: boolean;
    onClose: () => void;
    entry: HistoryEntry | null;
    user1: User;
    user2: User;
    users: User[];
    onEdit: (id: string, entry: EntryInput) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function ReviewDetailModal({
    open,
    onClose,
    entry,
    user1,
    user2,
    users,
    onEdit,
    onDelete
}: ReviewDetailModalProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const parsedWatchedDates = useMemo(() => {
        if (!entry?.review.watchedDates) return [];
        if (Array.isArray(entry.review.watchedDates)) {
            return [...entry.review.watchedDates].sort();
        }
        if (typeof entry.review.watchedDates === "string") {
            try {
                const parsed = JSON.parse(entry.review.watchedDates);
                if (Array.isArray(parsed)) return [...parsed].sort();
            } catch {
                // ignora
            }
        }
        return [];
    }, [entry]);

    const handleDelete = async () => {
        if (!entry || deleting) return;
        setDeleting(true);
        try {
            await onDelete(entry.review.id);
            setConfirmDelete(false);
            onClose();
        } catch (error) {
            console.error("Erro ao excluir registro:", error);
        } finally {
            setDeleting(false);
        }
    };

    const isTv =
        entry?.review.mediaType === "tv" || entry?.movie.mediaType === "tv";
    const isAbandoned = entry?.review.status === "abandoned";
    const durationInfo = useMemo(
        () => (entry ? getEntryDurationMinutes(entry) : { minutes: 0, isEstimated: false }),
        [entry]
    );

    return (
        <>
            <Modal open={open} onClose={onClose}>
                {entry && (
                    <div className="flex max-h-[80vh] flex-col animate-slideUp sm:flex-row">
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
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                        {isTv && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                                <Tv size={11} />
                                                {entry.review.seasonName ||
                                                    (entry.review.seasonNumber
                                                        ? `${entry.review.seasonNumber}ª Temporada`
                                                        : "Série")}
                                            </span>
                                        )}
                                        {isTv && entry.review.episodesWatched && (
                                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {entry.review.episodesWatched}
                                                {entry.review.totalEpisodes
                                                    ? `/${entry.review.totalEpisodes}`
                                                    : ""}{" "}
                                                eps
                                            </span>
                                        )}
                                        {isAbandoned && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                <FlagOff size={11} />
                                                Abandonada
                                                {entry.review.abandonedReason
                                                    ? `: ${entry.review.abandonedReason}`
                                                    : ""}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        {entry.movie.title}
                                        {entry.movie.release_date && (
                                            <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">
                                                ({entry.movie.release_date.slice(0, 4)})
                                            </span>
                                        )}
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {entry.movie.genres.join(" · ")}
                                    </p>
                                </div>
                                <a
                                    href={`https://www.themoviedb.org/${isTv ? "tv" : "movie"}/${entry.movie.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                                    title="Ver ficha completa no TMDB"
                                >
                                    <span>TMDB</span>
                                    <ExternalLink size={12} />
                                </a>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays size={14} className="text-gray-400" />
                                    {parsedWatchedDates.length > 1
                                        ? `Assistido de ${formatDate(parsedWatchedDates[0])} a ${formatDate(parsedWatchedDates[parsedWatchedDates.length - 1])} (${parsedWatchedDates.length} dias)`
                                        : `Assistido em ${formatDate(entry.review.dateWatched)}`}
                                </span>
                                {entry.isRewatch && !isTv && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                                        <RotateCcw size={12} />
                                        {entry.sessionNumber}ª sessão ({entry.totalSessions} no total)
                                    </span>
                                )}
                                {durationInfo.minutes > 0 && (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock size={12} />
                                        {formatDuration(durationInfo.minutes)}
                                        {isTv && entry.review.runtimePerEpisode
                                            ? ` (~${entry.review.runtimePerEpisode}m/ep)`
                                            : ` (${durationInfo.minutes} min)`}
                                    </span>
                                )}
                                {entry.review.platform && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                                        <Tv size={12} />
                                        {entry.review.platform}
                                    </span>
                                )}
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

                            {/* Sinopse oficial do TMDB */}
                            {entry.movie.overview && (
                                <div className="mt-4 rounded-xl bg-gray-50/80 p-3.5 dark:bg-gray-800/40">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        Sinopse
                                    </h4>
                                    <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                                        {entry.movie.overview}
                                    </p>
                                </div>
                            )}

                            {/* Avaliação da dupla */}
                            <div className="mt-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Avaliação da Dupla
                                </h4>
                                <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                                    {entry.review.textReview}
                                </p>
                            </div>

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

                            {/* Ações */}
                            <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                                {confirmDelete ? (
                                    <>
                                        <span className="mr-auto text-sm text-gray-600 dark:text-gray-300">
                                            Excluir este registro?
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(false)}
                                            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {deleting ? (
                                                <>
                                                    <Loader2 size={13} className="animate-spin" />
                                                    Excluindo...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={13} />
                                                    Excluir
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setEditOpen(true)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                        >
                                            <Pencil size={13} />
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(true)}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                        >
                                            <Trash2 size={13} />
                                            Excluir
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de edição */}
            {entry && (
                <EditReviewModal
                    key={entry.review.id}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    review={entry.review}
                    movie={entry.movie}
                    users={users}
                    onSave={onEdit}
                />
            )}
        </>
    );
}
