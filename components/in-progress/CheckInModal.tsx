"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, PartyPopper, Sparkles, Tv } from "lucide-react";
import type { DbSeriesCheckin, DbSeriesProgressWithCheckins } from "@/types";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

interface CheckInModalProps {
    open: boolean;
    onClose: () => void;
    series: DbSeriesProgressWithCheckins | null;
    onRequestComplete?: (series: DbSeriesProgressWithCheckins) => void;
}

export function CheckInModal({
    open,
    onClose,
    series,
    onRequestComplete
}: CheckInModalProps) {
    const { checkinSeries } = useReviews();
    const headingId = useId();
    const startInputId = useId();
    const endInputId = useId();
    const dateInputId = useId();

    const [episodeStart, setEpisodeStart] = useState(1);
    const [episodeEnd, setEpisodeEnd] = useState(1);
    const [dateWatched, setDateWatched] = useState(() =>
        new Date().toISOString().slice(0, 10)
    );
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [completedPrompt, setCompletedPrompt] = useState<DbSeriesCheckin | null>(null);

    useEffect(() => {
        if (!open || !series) return;
        const nextEp = Math.min(series.totalEpisodes, Math.max(1, series.currentEpisode + 1));
        setEpisodeStart(nextEp);
        setEpisodeEnd(nextEp);
        setDateWatched(new Date().toISOString().slice(0, 10));
        setErrorMessage(null);
        setCompletedPrompt(null);
        setSaving(false);
    }, [open, series]);

    const generatedTag = useMemo(() => {
        if (!series) return "";
        const seasonCode = `S${String(series.seasonNumber).padStart(2, "0")}`;
        return episodeStart === episodeEnd
            ? `${seasonCode} • Ep ${episodeStart}`
            : `${seasonCode} • Eps ${episodeStart}-${episodeEnd}`;
    }, [series, episodeStart, episodeEnd]);

    if (!series) return null;

    const nextBaseEp = Math.min(series.totalEpisodes, Math.max(1, series.currentEpisode + 1));

    const validateFields = (start: number, end: number): string | null => {
        if (!Number.isInteger(start) || start < 1) {
            return "Informe um episódio inicial válido (mínimo 1).";
        }
        if (!Number.isInteger(end) || end < start) {
            return "O episódio final deve ser maior ou igual ao episódio inicial.";
        }
        if (end > series.totalEpisodes) {
            return `A temporada possui ${series.totalEpisodes} episódios no total.`;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateWatched)) {
            return "Selecione uma data válida.";
        }
        return null;
    };

    const applyPreset = (count: number) => {
        const start = nextBaseEp;
        const end = Math.min(series.totalEpisodes, start + count - 1);
        setEpisodeStart(start);
        setEpisodeEnd(end);
        setErrorMessage(null);
    };

    const applyToEnd = () => {
        setEpisodeStart(nextBaseEp);
        setEpisodeEnd(series.totalEpisodes);
        setErrorMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        const err = validateFields(episodeStart, episodeEnd);
        if (err) {
            setErrorMessage(err);
            return;
        }

        setSaving(true);
        setErrorMessage(null);
        try {
            const saved = await checkinSeries({
                seriesProgressId: series.id,
                dateWatched,
                episodeStart,
                episodeEnd,
                episodeTag: generatedTag
            });

            if (episodeEnd >= series.totalEpisodes && onRequestComplete) {
                setCompletedPrompt(saved);
            } else {
                onClose();
            }
        } catch (err) {
            setErrorMessage(
                err instanceof Error ? err.message : "Não foi possível salvar o check-in."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-6 sm:p-7">
                {completedPrompt ? (
                    <div className="space-y-5 text-center animate-fadeIn">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <PartyPopper size={24} />
                        </div>
                        <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                {completedPrompt.episodeTag} registrado
                            </span>
                            <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                                Terminaram a temporada?
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Vocês chegaram ao episódio {series.totalEpisodes} de{" "}
                                <strong className="text-gray-800 dark:text-gray-200">
                                    {series.title} ({series.seasonName})
                                </strong>
                                . Vamos dar as notas e registrar no Diário?
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onRequestComplete?.({
                                        ...series,
                                        currentEpisode: series.totalEpisodes,
                                        checkins: [
                                            completedPrompt,
                                            ...series.checkins.filter(
                                                (c) => c.id !== completedPrompt.id
                                            )
                                        ]
                                    });
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                            >
                                <Sparkles size={16} />
                                Avaliar temporada agora
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Deixar para depois
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} aria-labelledby={headingId} className="space-y-5">
                        <div className="flex items-start justify-between gap-3 pr-8">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                        <Tv size={11} />
                                        {series.seasonName}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        Progresso: {series.currentEpisode}/{series.totalEpisodes} eps
                                    </span>
                                </div>
                                <h3
                                    id={headingId}
                                    className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white"
                                >
                                    Assistimos hoje — {series.title}
                                </h3>
                            </div>
                        </div>

                        {/* Atalhos rápidos de incremento */}
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Seleção rápida
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3].map((count) => {
                                    const targetEnd = nextBaseEp + count - 1;
                                    const disabled = targetEnd > series.totalEpisodes;
                                    const isActive =
                                        episodeStart === nextBaseEp && episodeEnd === targetEnd;

                                    return (
                                        <button
                                            key={count}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => applyPreset(count)}
                                            className={cn(
                                                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                                                isActive
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
                                                disabled && "cursor-not-allowed opacity-40"
                                            )}
                                        >
                                            +{count} {count === 1 ? "ep" : "eps"}{" "}
                                            <span className="opacity-75">
                                                (
                                                {count === 1
                                                    ? `Ep ${nextBaseEp}`
                                                    : `Eps ${nextBaseEp}-${Math.min(series.totalEpisodes, targetEnd)}`}
                                                )
                                            </span>
                                        </button>
                                    );
                                })}

                                {nextBaseEp < series.totalEpisodes && (
                                    <button
                                        type="button"
                                        onClick={applyToEnd}
                                        className={cn(
                                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                                            episodeStart === nextBaseEp &&
                                                episodeEnd === series.totalEpisodes
                                                ? "bg-emerald-600 text-white shadow-sm"
                                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                                        )}
                                    >
                                        Até o final (Eps {nextBaseEp}-{series.totalEpisodes})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Intervalo customizado de episódios */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label
                                    htmlFor={startInputId}
                                    className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    Do episódio
                                </label>
                                <input
                                    id={startInputId}
                                    name="episodeStart"
                                    type="number"
                                    min={1}
                                    max={series.totalEpisodes}
                                    value={episodeStart}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setEpisodeStart(val);
                                        if (val > episodeEnd) {
                                            setEpisodeEnd(Math.min(series.totalEpisodes, val));
                                        }
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    onBlur={() => {
                                        const err = validateFields(episodeStart, episodeEnd);
                                        if (err) setErrorMessage(err);
                                    }}
                                    aria-invalid={Boolean(errorMessage)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor={endInputId}
                                    className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    Até o episódio (máx. {series.totalEpisodes})
                                </label>
                                <input
                                    id={endInputId}
                                    name="episodeEnd"
                                    type="number"
                                    min={episodeStart}
                                    max={series.totalEpisodes}
                                    value={episodeEnd}
                                    onChange={(e) => {
                                        setEpisodeEnd(Number(e.target.value));
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    onBlur={() => {
                                        const err = validateFields(episodeStart, episodeEnd);
                                        if (err) setErrorMessage(err);
                                    }}
                                    aria-invalid={Boolean(errorMessage)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Data da sessão */}
                        <div>
                            <label
                                htmlFor={dateInputId}
                                className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                            >
                                Data da sessão
                            </label>
                            <input
                                id={dateInputId}
                                name="dateWatched"
                                type="date"
                                value={dateWatched}
                                onChange={(e) => {
                                    setDateWatched(e.target.value);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                            />
                        </div>

                        {/* Prévia da etiqueta no calendário */}
                        <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 px-4 py-3 dark:bg-indigo-500/10">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                Etiqueta no Calendário:
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                                <CalendarCheck size={13} />
                                {generatedTag}
                            </span>
                        </div>

                        {errorMessage && (
                            <p
                                role="alert"
                                className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
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
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-60"
                            >
                                <CheckCircle2 size={16} />
                                {saving ? "Salvando..." : "Registrar sessão"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}
