"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Movie } from "@/types";
import { users } from "@/lib/mockData";
import { getPosterUrl } from "@/lib/utils";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { Toast } from "@/components/ui/Toast";
import { MovieSearch } from "./MovieSearch";
import { cn } from "@/lib/cn";
import Image from "next/image";

export function AddEntryForm() {
    const { addEntry } = useReviews();

    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [dateWatched, setDateWatched] = useState("");
    const [ratingUser1, setRatingUser1] = useState(0);
    const [ratingUser2, setRatingUser2] = useState(0);
    const [textReview, setTextReview] = useState("");
    const [recommendedBy, setRecommendedBy] = useState(users[0].id);
    const [toastOpen, setToastOpen] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie(movie);
        setToastOpen(false);
        setErrors([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors: string[] = [];

        if (!selectedMovie) validationErrors.push("Selecione um filme.");
        if (!dateWatched) validationErrors.push("Informe a data assistida.");
        if (ratingUser1 === 0) validationErrors.push("Dê uma nota para o Usuário 1.");
        if (ratingUser2 === 0) validationErrors.push("Dê uma nota para o Usuário 2.");
        if (!textReview.trim()) validationErrors.push("Escreva uma avaliação curta.");

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        addEntry({
            movie: selectedMovie!,
            dateWatched,
            ratingUser1,
            ratingUser2,
            textReview: textReview.trim(),
            recommendedBy
        });

        // Reset para novo registro
        setSelectedMovie(null);
        setDateWatched("");
        setRatingUser1(0);
        setRatingUser2(0);
        setTextReview("");
        setRecommendedBy(users[0].id);
        setErrors([]);
        setToastOpen(true);

        window.setTimeout(() => setToastOpen(false), 3000);
    };

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800 sm:p-8">
            {!selectedMovie ? (
                <div>
                    <MovieSearch onSelect={handleSelectMovie} />
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        Digite pelo menos 2 caracteres para buscar na base do TMDB.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Filme selecionado */}
                    <div className="flex items-start gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                            {selectedMovie.poster_path ? (
                                <Image
                                    src={getPosterUrl(selectedMovie.poster_path, "w342")}
                                    alt={selectedMovie.title}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                />
                            ) : (
                                <span className="flex h-full items-center justify-center text-[10px] text-gray-400">
                                    Sem capa
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {selectedMovie.title}
                            </h3>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                {selectedMovie.release_date
                                    ? new Date(selectedMovie.release_date).getFullYear()
                                    : "Ano desconhecido"}
                                {selectedMovie.genres.length > 0 && ` · ${selectedMovie.genres.join(", ")}`}
                            </p>
                            <button
                                type="button"
                                onClick={() => setSelectedMovie(null)}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                            >
                                <X size={14} />
                                Trocar filme
                            </button>
                        </div>
                    </div>

                    {/* Data assistida */}
                    <div>
                        <label htmlFor="dateWatched" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Data assistida
                        </label>
                        <input
                            id="dateWatched"
                            type="date"
                            value={dateWatched}
                            onChange={(e) => setDateWatched(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700 [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>

                    {/* Notas dos usuários */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                            <div className="mb-3 flex items-center gap-2">
                                <Avatar src={users[0].avatar} name={users[0].name} size="sm" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {users[0].name}
                                </span>
                            </div>
                            <StarRatingInput
                                value={ratingUser1}
                                onChange={setRatingUser1}
                                label="Nota"
                            />
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                            <div className="mb-3 flex items-center gap-2">
                                <Avatar src={users[1].avatar} name={users[1].name} size="sm" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {users[1].name}
                                </span>
                            </div>
                            <StarRatingInput
                                value={ratingUser2}
                                onChange={setRatingUser2}
                                label="Nota"
                            />
                        </div>
                    </div>

                    {/* Texto de avaliação */}
                    <div>
                        <label htmlFor="textReview" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Avaliação curta
                        </label>
                        <textarea
                            id="textReview"
                            value={textReview}
                            onChange={(e) => setTextReview(e.target.value)}
                            rows={3}
                            maxLength={280}
                            placeholder="O que acharam do filme?"
                            className="w-full resize-none rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
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
                                        name="recommendedBy"
                                        value={user.id}
                                        checked={recommendedBy === user.id}
                                        onChange={() => setRecommendedBy(user.id)}
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

                    {/* Erros */}
                    {errors.length > 0 && (
                        <ul className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            {errors.map((error) => (
                                <li key={error} className="flex items-center gap-2">
                                    <span className="text-red-400">•</span>
                                    {error}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Botão salvar */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-dark"
                        >
                            Salvar registro
                        </button>
                    </div>
                </form>
            )}

            {/* Toast de sucesso */}
            <Toast
                open={toastOpen}
                message="Registro adicionado ao histórico!"
                onClose={() => setToastOpen(false)}
            />
        </div>
    );
}
