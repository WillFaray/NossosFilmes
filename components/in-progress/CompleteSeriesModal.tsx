"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CheckCircle2, Clock, Tv } from "lucide-react";
import type { DbSeriesProgressWithCheckins } from "@/types";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { WatchedDatesPicker } from "@/components/common/WatchedDatesPicker";
import { formatDuration, parseRuntimeInput } from "@/lib/runtime";
import { cn } from "@/lib/cn";

const PLATFORM_OPTIONS = [
    "Netflix",
    "Max",
    "Prime Video",
    "Disney+",
    "Apple TV+",
    "Globoplay",
    "Mubi",
    "Casa"
];

interface CompleteSeriesModalProps {
    open: boolean;
    onClose: () => void;
    series: DbSeriesProgressWithCheckins | null;
}

export function CompleteSeriesModal({
    open,
    onClose,
    series
}: CompleteSeriesModalProps) {
    const { users, completeSeries } = useReviews();
    const headingId = useId();
    const runtimeInputId = useId();
    const reviewTextareaId = useId();

    const [ratingUser1, setRatingUser1] = useState(0);
    const [ratingUser2, setRatingUser2] = useState(0);
    const [textReview, setTextReview] = useState("");
    const [platform, setPlatform] = useState("");
    const [runtimePerEpisode, setRuntimePerEpisode] = useState("45");
    const [recommendedBy, setRecommendedBy] = useState(users[0]?.id ?? "");
    const [watchedDates, setWatchedDates] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !series) return;
        setRatingUser1(0);
        setRatingUser2(0);
        setTextReview("");
        setPlatform(series.platform || "");
        setRuntimePerEpisode(String(series.runtimePerEpisode || 45));
        setRecommendedBy(users[0]?.id ?? "");

        const fromCheckins = Array.from(
            new Set(series.checkins.map((c) => c.dateWatched))
        ).sort();
        setWatchedDates(
            fromCheckins.length > 0
                ? fromCheckins
                : [new Date().toISOString().slice(0, 10)]
        );
        setErrorMessage(null);
        setSaving(false);
    }, [open, series, users]);

    const parsedEpRuntime = useMemo(
        () => parseRuntimeInput(runtimePerEpisode, series?.runtimePerEpisode || 45),
        [runtimePerEpisode, series]
    );

    if (!series || users.length < 2) return null;

    const totalMinutes = series.totalEpisodes * parsedEpRuntime;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        if (ratingUser1 < 0.5 || ratingUser2 < 0.5) {
            setErrorMessage("Por favor, informem a nota dos dois para a temporada.");
            return;
        }
        if (!textReview.trim()) {
            setErrorMessage("Escrevam uma avaliação curta sobre a temporada.");
            return;
        }
        if (watchedDates.length === 0) {
            setErrorMessage("Selecionem pelo menos um dia assistido no calendário.");
            return;
        }

        setSaving(true);
        setErrorMessage(null);
        try {
            const sorted = [...watchedDates].sort();
            await completeSeries(series.id, {
                ratingUser1,
                ratingUser2,
                textReview: textReview.trim(),
                recommendedById: recommendedBy || users[0].id,
                platform: platform.trim() || undefined,
                watchedDates: sorted,
                dateWatched: sorted[sorted.length - 1],
                runtimePerEpisode: parsedEpRuntime,
                totalEpisodes: series.totalEpisodes,
                episodesWatched: series.totalEpisodes
            });
            onClose();
        } catch (err) {
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : "Não foi possível concluir a temporada."
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
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <Tv size={12} />
                            Concluir {series.seasonName} ({series.totalEpisodes} eps)
                        </span>
                        <h3
                            id={headingId}
                            className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white"
                        >
                            Avaliar {series.title}
                        </h3>
                    </div>

                    {/* Notas dos dois usuários */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {users.map((user, idx) => (
                            <div
                                key={user.id}
                                className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/50"
                            >
                                <div className="mb-2.5 flex items-center gap-2">
                                    <Avatar src={user.avatar} name={user.name} size="sm" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {user.name}
                                    </span>
                                </div>
                                <StarRatingInput
                                    value={idx === 0 ? ratingUser1 : ratingUser2}
                                    onChange={(val) => {
                                        if (idx === 0) setRatingUser1(val);
                                        else setRatingUser2(val);
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    label="Nota"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Avaliação curta */}
                    <div>
                        <label
                            htmlFor={reviewTextareaId}
                            className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                        >
                            Avaliação da temporada
                        </label>
                        <textarea
                            id={reviewTextareaId}
                            name="textReview"
                            rows={3}
                            maxLength={280}
                            value={textReview}
                            onChange={(e) => {
                                setTextReview(e.target.value);
                                if (errorMessage) setErrorMessage(null);
                            }}
                            placeholder="O que acharam dessa temporada?"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                        />
                        <p className="mt-1 text-right text-[11px] text-gray-400">
                            {textReview.length}/280
                        </p>
                    </div>

                    {/* Mini-calendário com dias assistidos */}
                    <WatchedDatesPicker
                        selectedDates={watchedDates}
                        onChange={(dates) => {
                            setWatchedDates(dates);
                            if (errorMessage) setErrorMessage(null);
                        }}
                        label="Dias em que assistiram à temporada"
                    />

                    {/* Duração por episódio & Plataforma */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label
                                    htmlFor={runtimeInputId}
                                    className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    <Clock size={13} />
                                    Minutos por episódio
                                </label>
                                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                    Total: {formatDuration(totalMinutes)}
                                </span>
                            </div>
                            <input
                                id={runtimeInputId}
                                name="runtimePerEpisode"
                                type="number"
                                min={1}
                                max={300}
                                value={runtimePerEpisode}
                                onChange={(e) => setRuntimePerEpisode(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                            />
                        </div>

                        <fieldset>
                            <legend className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Quem indicou?
                            </legend>
                            <div className="flex gap-2">
                                {users.map((u) => (
                                    <label
                                        key={u.id}
                                        className={cn(
                                            "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                                            recommendedBy === u.id
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300"
                                                : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="recommendedBy"
                                            value={u.id}
                                            checked={recommendedBy === u.id}
                                            onChange={() => setRecommendedBy(u.id)}
                                            className="sr-only"
                                        />
                                        <Avatar src={u.avatar} name={u.name} size="sm" className="h-5 w-5" />
                                        {u.name.split(" ")[0]}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    {/* Plataforma */}
                    <div>
                        <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Onde assistiram? (opcional)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {PLATFORM_OPTIONS.map((item) => {
                                const active = platform === item;
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setPlatform(active ? "" : item)}
                                        className={cn(
                                            "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                                            active
                                                ? "bg-indigo-600 text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>
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
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-60"
                        >
                            <CheckCircle2 size={16} />
                            {saving ? "Salvando..." : "Concluir e salvar no Diário"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
