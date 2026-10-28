"use client";

import { useState } from "react";
import { Loader2, Save, Tv } from "lucide-react";
import type { Movie, Review, User } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { cn } from "@/lib/cn";
import type { EntryInput } from "@/components/reviews/ReviewProvider";

const PLATFORM_OPTIONS = [
    "Cinema",
    "Netflix",
    "Max",
    "Prime Video",
    "Disney+",
    "Apple TV+",
    "Mubi",
    "Casa"
];

interface EditReviewModalProps {
    open: boolean;
    onClose: () => void;
    review: Review;
    movie: Movie;
    users: User[];
    onSave: (id: string, entry: EntryInput) => Promise<void>;
}

export function EditReviewModal({ open, onClose, review, movie, users, onSave }: EditReviewModalProps) {
    const [dateWatched, setDateWatched] = useState(review.dateWatched);
    const [ratingUser1, setRatingUser1] = useState(review.ratingUser1);
    const [ratingUser2, setRatingUser2] = useState(review.ratingUser2);
    const [textReview, setTextReview] = useState(review.textReview);
    const [platform, setPlatform] = useState(review.platform ?? "");
    const [recommendedBy, setRecommendedBy] = useState(review.recommendedBy);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!dateWatched) {
            setError("Informe a data assistida.");
            return;
        }
        if (ratingUser1 === 0) {
            setError("Dê uma nota para o Usuário 1.");
            return;
        }
        if (ratingUser2 === 0) {
            setError("Dê uma nota para o Usuário 2.");
            return;
        }
        if (!textReview.trim()) {
            setError("Escreva uma avaliação curta.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(review.id, {
                movie,
                dateWatched,
                ratingUser1,
                ratingUser2,
                textReview: textReview.trim(),
                platform: platform.trim() || undefined,
                recommendedBy
            });
            onClose();
        } catch (error) {
            console.error("Erro ao salvar edição:", error);
            setError("Não foi possível salvar as alterações. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-6 sm:p-8 animate-slideUp">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Editar Registro
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {movie.title}
                </p>

                <div className="mt-6 space-y-5">
                    {/* Data assistida */}
                    <div>
                        <label htmlFor="editDateWatched" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Data assistida
                        </label>
                        <input
                            id="editDateWatched"
                            type="date"
                            value={dateWatched}
                            onChange={(e) => setDateWatched(e.target.value)}
                            disabled={saving}
                            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700 [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>

                    {/* Onde assistiram? (Opcional) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <Tv size={15} className="text-gray-400" />
                                Onde assistiram? <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(opcional)</span>
                            </label>
                            {platform && (
                                <button
                                    type="button"
                                    onClick={() => setPlatform("")}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {PLATFORM_OPTIONS.map((item) => {
                                const isSelected = platform === item;
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => setPlatform(isSelected ? "" : item)}
                                        className={cn(
                                            "rounded-xl px-2.5 py-1 text-xs font-medium transition-all",
                                            isSelected
                                                ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>
                        <input
                            type="text"
                            placeholder="Ou digite outro local/streaming..."
                            value={PLATFORM_OPTIONS.includes(platform) ? "" : platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            disabled={saving}
                            maxLength={50}
                            className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2 text-xs text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                        />
                    </div>

                    {/* Notas dos dois perfis */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                            <div className="mb-2 flex items-center gap-2">
                                <Avatar src={users[0]?.avatar} name={users[0]?.name ?? "Usuário 1"} size="sm" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                    {users[0]?.name}
                                </span>
                            </div>
                            <StarRatingInput
                                value={ratingUser1}
                                onChange={setRatingUser1}
                                label="Nota"
                            />
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                            <div className="mb-2 flex items-center gap-2">
                                <Avatar src={users[1]?.avatar} name={users[1]?.name ?? "Usuário 2"} size="sm" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                    {users[1]?.name}
                                </span>
                            </div>
                            <StarRatingInput
                                value={ratingUser2}
                                onChange={setRatingUser2}
                                label="Nota"
                            />
                        </div>
                    </div>

                    {/* Avaliação em texto */}
                    <div>
                        <label htmlFor="editTextReview" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Avaliação curta
                        </label>
                        <textarea
                            id="editTextReview"
                            value={textReview}
                            onChange={(e) => setTextReview(e.target.value)}
                            disabled={saving}
                            rows={3}
                            maxLength={280}
                            className="w-full resize-none rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                        />
                        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
                            {textReview.length}/280
                        </p>
                    </div>

                    {/* Quem indicou? */}
                    <div>
                        <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Quem indicou?
                        </span>
                        <div className="flex gap-3">
                            {users.map((user) => (
                                <label
                                    key={user.id}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-colors",
                                        recommendedBy === user.id
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="editRecommendedBy"
                                        value={user.id}
                                        checked={recommendedBy === user.id}
                                        onChange={() => setRecommendedBy(user.id)}
                                        disabled={saving}
                                        className="sr-only"
                                    />
                                    <Avatar src={user.avatar} name={user.name} size="sm" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {user.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save size={15} />
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
