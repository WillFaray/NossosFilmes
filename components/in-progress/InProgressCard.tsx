"use client";

import { useId, useState } from "react";
import Image from "next/image";
import {
    CalendarCheck,
    CheckCircle2,
    FlagOff,
    Trash2,
    Tv
} from "lucide-react";
import type { DbSeriesProgressWithCheckins } from "@/types";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { formatDate, getPosterUrl } from "@/lib/utils";

interface InProgressCardProps {
    series: DbSeriesProgressWithCheckins;
    onOpenCheckIn: (series: DbSeriesProgressWithCheckins) => void;
    onOpenComplete: (series: DbSeriesProgressWithCheckins) => void;
    onOpenAbandon: (series: DbSeriesProgressWithCheckins) => void;
}

export function InProgressCard({
    series,
    onOpenCheckIn,
    onOpenComplete,
    onOpenAbandon
}: InProgressCardProps) {
    const { cancelSeriesProgress } = useReviews();
    const progressLabelId = useId();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const total = Math.max(1, series.totalEpisodes);
    const current = Math.min(total, Math.max(0, series.currentEpisode));
    const percent = Math.round((current / total) * 100);
    const isFinished = current >= total;
    const lastCheckin = series.checkins[0] ?? null;

    const handleSilentDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await cancelSeriesProgress(series.id);
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md dark:bg-card-dark dark:ring-gray-800">
            <div className="flex gap-4">
                {/* Pôster */}
                <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                    {series.posterPath ? (
                        <Image
                            src={getPosterUrl(series.posterPath, "w342")}
                            alt={series.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-gray-400">
                            Sem pôster
                        </div>
                    )}
                </div>

                {/* Informações e barra de progresso */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                <Tv size={11} />
                                {series.seasonName}
                            </span>
                            {series.platform && (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    {series.platform}
                                </span>
                            )}
                        </div>

                        <h3 className="mt-1.5 truncate text-base font-bold text-gray-900 dark:text-white">
                            {series.title}
                        </h3>

                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {lastCheckin
                                ? `Última: ${lastCheckin.episodeTag} • ${formatDate(lastCheckin.dateWatched)}`
                                : "Nenhuma sessão registrada ainda"}
                        </p>
                    </div>

                    {/* Progresso */}
                    <div className="mt-3">
                        <div
                            id={progressLabelId}
                            className="mb-1 flex items-center justify-between text-xs"
                        >
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                Ep {current} de {total}
                            </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {percent}%
                            </span>
                        </div>
                        <progress
                            className="series-progress h-2 w-full"
                            value={current}
                            max={total}
                            aria-labelledby={progressLabelId}
                        />
                    </div>
                </div>
            </div>

            {/* Ações rápidas */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                    {!isFinished && (
                        <button
                            type="button"
                            onClick={() => onOpenCheckIn(series)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                        >
                            <CalendarCheck size={14} />
                            Assistimos hoje
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onOpenComplete(series)}
                        className={
                            isFinished
                                ? "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
                                : "inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                        }
                    >
                        <CheckCircle2 size={14} />
                        {isFinished ? "Avaliar temporada" : "Concluir"}
                    </button>
                </div>

                {/* Botões de abandonar / cancelar silenciosamente */}
                {confirmDelete ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                            Excluir sem histórico?
                        </span>
                        <button
                            type="button"
                            disabled={deleting}
                            onClick={handleSilentDelete}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                        >
                            Sim
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        >
                            Não
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onOpenAbandon(series)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:text-gray-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                            title="Marcar série como abandonada com avaliação leve"
                        >
                            <FlagOff size={13} />
                            Abandonar
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            title="Cancelar e excluir sem poluir o histórico"
                            aria-label={`Cancelar acompanhamento de ${series.title}`}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
