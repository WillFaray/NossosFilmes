"use client";

import { useEffect, useId, useState } from "react";
import { FlagOff } from "lucide-react";
import type { DbSeriesProgressWithCheckins } from "@/types";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { cn } from "@/lib/cn";

const ABANDON_REASONS = [
    "Ficou chata",
    "Ritmo muito lento",
    "Não prendeu a atenção",
    "História confusa",
    "Perdemos o interesse"
];

interface AbandonSeriesModalProps {
    open: boolean;
    onClose: () => void;
    series: DbSeriesProgressWithCheckins | null;
}

export function AbandonSeriesModal({
    open,
    onClose,
    series
}: AbandonSeriesModalProps) {
    const { users, abandonSeries } = useReviews();
    const headingId = useId();
    const customReasonId = useId();
    const episodesInputId = useId();
    const commentId = useId();

    const [selectedReason, setSelectedReason] = useState(ABANDON_REASONS[0]);
    const [customReason, setCustomReason] = useState("");
    const [episodesWatched, setEpisodesWatched] = useState(1);
    const [ratingUser1, setRatingUser1] = useState(2.0);
    const [ratingUser2, setRatingUser2] = useState(2.0);
    const [textReview, setTextReview] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !series) return;
        setSelectedReason(ABANDON_REASONS[0]);
        setCustomReason("");
        setEpisodesWatched(Math.max(1, series.currentEpisode || 1));
        setRatingUser1(2.0);
        setRatingUser2(2.0);
        setTextReview("");
        setErrorMessage(null);
        setSaving(false);
    }, [open, series]);

    if (!series || users.length < 2) return null;

    const finalReason = customReason.trim() || selectedReason;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        if (!finalReason) {
            setErrorMessage("Selecione ou informe um motivo rápido para o abandono.");
            return;
        }

        setSaving(true);
        setErrorMessage(null);
        try {
            await abandonSeries(series.id, {
                abandonedReason: finalReason,
                episodesWatched: Math.min(
                    series.totalEpisodes,
                    Math.max(0, episodesWatched)
                ),
                ratingUser1: ratingUser1 > 0 ? ratingUser1 : 2.0,
                ratingUser2: ratingUser2 > 0 ? ratingUser2 : 2.0,
                textReview:
                    textReview.trim() || `Série abandonada: ${finalReason}`
            });
            onClose();
        } catch (err) {
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : "Não foi possível marcar a série como abandonada."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
                <form onSubmit={handleSubmit} aria-labelledby={headingId} className="space-y-5">
                    <div className="pr-8">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            <FlagOff size={12} />
                            Marcar como Abandonada
                        </span>
                        <h3
                            id={headingId}
                            className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white"
                        >
                            {series.title} ({series.seasonName})
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Registra uma avaliação leve no Diário com os episódios vistos até aqui.
                        </p>
                    </div>

                    {/* Opções rápidas de motivo */}
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Motivo rápido
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {ABANDON_REASONS.map((reason) => {
                                const isActive =
                                    !customReason.trim() && selectedReason === reason;
                                return (
                                    <button
                                        key={reason}
                                        type="button"
                                        onClick={() => {
                                            setSelectedReason(reason);
                                            setCustomReason("");
                                        }}
                                        className={cn(
                                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                                            isActive
                                                ? "bg-amber-600 text-white shadow-sm"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        {reason}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2.5">
                            <label htmlFor={customReasonId} className="sr-only">
                                Outro motivo
                            </label>
                            <input
                                id={customReasonId}
                                type="text"
                                maxLength={80}
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Ou digite outro motivo..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Episódios assistidos antes de parar */}
                    <div>
                        <label
                            htmlFor={episodesInputId}
                            className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                            Quantos episódios chegaram a assistir? (de {series.totalEpisodes})
                        </label>
                        <input
                            id={episodesInputId}
                            type="number"
                            min={0}
                            max={series.totalEpisodes}
                            value={episodesWatched}
                            onChange={(e) => setEpisodesWatched(Number(e.target.value))}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                        />
                    </div>

                    {/* Notas leves opcionais */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {users.map((user, idx) => (
                            <div
                                key={user.id}
                                className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/50"
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    <Avatar src={user.avatar} name={user.name} size="sm" />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                        {user.name}
                                    </span>
                                </div>
                                <StarRatingInput
                                    value={idx === 0 ? ratingUser1 : ratingUser2}
                                    onChange={(val) => {
                                        if (idx === 0) setRatingUser1(val);
                                        else setRatingUser2(val);
                                    }}
                                    label="Nota até onde viram"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Comentário opcional */}
                    <div>
                        <label
                            htmlFor={commentId}
                            className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                            Comentário rápido (opcional)
                        </label>
                        <textarea
                            id={commentId}
                            rows={2}
                            maxLength={280}
                            value={textReview}
                            onChange={(e) => setTextReview(e.target.value)}
                            placeholder={`Ex: Paramos no episódio ${episodesWatched} porque ${finalReason.toLowerCase()}...`}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                        />
                    </div>

                    {errorMessage && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-3.5 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        >
                            {errorMessage}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Voltar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-500 disabled:opacity-60"
                        >
                            <FlagOff size={15} />
                            {saving ? "Salvando..." : "Confirmar abandono"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
