"use client";

import Image from "next/image";
import { Calendar, Clock, Tv } from "lucide-react";
import type { CalendarSessionItem } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { formatDuration } from "@/lib/runtime";

interface CheckInDetailModalProps {
    open: boolean;
    onClose: () => void;
    session: CalendarSessionItem | null;
}

export function CheckInDetailModal({
    open,
    onClose,
    session
}: CheckInDetailModalProps) {
    if (!session) return null;

    const checkin = session.checkin;
    const progress = session.seriesProgress;
    const episodesCount = checkin
        ? Math.max(1, checkin.episodeEnd - checkin.episodeStart + 1)
        : 1;
    const runtimePerEpisode = progress?.runtimePerEpisode || 45;
    const sessionDuration = formatDuration(episodesCount * runtimePerEpisode);

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-6 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row">
                    {/* Pôster da Série */}
                    <div className="relative mx-auto aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-gray-200 sm:mx-0 dark:bg-gray-800 dark:ring-gray-700">
                        {session.posterPath ? (
                            <Image
                                src={getPosterUrl(session.posterPath, "w342")}
                                alt={session.title}
                                fill
                                sizes="128px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-gray-400">
                                Sem pôster
                            </div>
                        )}
                    </div>

                    {/* Detalhes da Sessão */}
                    <div className="flex flex-1 flex-col justify-between space-y-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                                    <Tv size={12} />
                                    {session.sessionTag || "Sessão de Série"}
                                </span>
                                {progress?.seasonName && (
                                    <span className="rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                        {progress.seasonName}
                                    </span>
                                )}
                                {progress?.platform && (
                                    <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                        {progress.platform}
                                    </span>
                                )}
                            </div>

                            <h3 className="mt-2.5 text-xl font-bold text-gray-900 dark:text-white">
                                {session.title}
                            </h3>

                            {progress?.genres && progress.genres.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {progress.genres.map((g) => (
                                        <span
                                            key={g}
                                            className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                        >
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/50">
                            <div>
                                <p className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                    <Calendar size={12} />
                                    Data assistida
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatDate(session.dateWatched)}
                                </p>
                            </div>

                            <div>
                                <p className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                    <Clock size={12} />
                                    Tempo da sessão
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                                    {sessionDuration}{" "}
                                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                        ({episodesCount} {episodesCount === 1 ? "ep" : "eps"})
                                    </span>
                                </p>
                            </div>
                        </div>

                        {progress && (
                            <div>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="font-medium text-gray-600 dark:text-gray-300">
                                        Progresso da temporada
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {progress.currentEpisode} / {progress.totalEpisodes} episódios
                                    </span>
                                </div>
                                <progress
                                    className="series-progress h-2 w-full"
                                    value={progress.currentEpisode}
                                    max={progress.totalEpisodes}
                                    aria-label={`Progresso de ${session.title}`}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </Modal>
    );
}
