"use client";

import { useEffect, useRef, useState } from "react";
import { Dices, RotateCcw, Sparkles } from "lucide-react";
import Image from "next/image";
import type { Movie } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface RouletteModalProps {
    open: boolean;
    onClose: () => void;
    movies: Movie[];
}

export function RouletteModal({ open, onClose, movies }: RouletteModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [result, setResult] = useState<Movie | null>(null);
    const [rolling, setRolling] = useState(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timersRef.current.forEach((t) => clearTimeout(t));
        timersRef.current = [];
    };

    // Reinicia o estado quando abre
    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
            setResult(null);
            setRolling(false);
        } else {
            clearTimers();
        }

        return () => clearTimers();
    }, [open]);

    const spin = () => {
        if (movies.length === 0 || rolling) return;

        setRolling(true);
        setResult(null);
        setCurrentIndex(0);
        clearTimers();

        // Define o filme final (aleatório) e calcula quantas paradas para alcançá-lo
        const finalIndex = Math.floor(Math.random() * movies.length);

        // Total de passos: entre 2.5 e 3.5 voltas completas para dar sensação de duração
        const totalSteps = movies.length * 3 + ((finalIndex - movies.length) % movies.length + movies.length) % movies.length;
        // O último passo deve cair exatamente no finalIndex
        const steps = Math.max(totalSteps, movies.length * 2 + finalIndex + 1);

        const durations: number[] = [];
        let elapsed = 0;
        // Easing: começa rápido e desacelera gradativamente (de 60ms até 450ms)
        for (let i = 0; i < steps; i++) {
            const progress = i / steps;
            const duration = 60 + progress * progress * 390; // quadrático: desacelera
            durations.push(duration);
            elapsed += duration;
        }

        let stepCount = 0;

        const tick = () => {
            // Avança um passo e ajusta o índice
            const newIndex = (stepCount + 1) % movies.length;
            setCurrentIndex(newIndex);
            stepCount += 1;

            if (stepCount >= steps) {
                // Garante que o índice final seja exatamente o sorteado
                setCurrentIndex(finalIndex);
                setResult(movies[finalIndex]);
                setRolling(false);
                return;
            }

            const nextTimer = setTimeout(tick, durations[stepCount]);
            timersRef.current.push(nextTimer);
        };

        const firstTimer = setTimeout(tick, durations[0]);
        timersRef.current.push(firstTimer);
    };

    const previewMovie = result ?? movies[currentIndex];
    const hasMovies = movies.length > 0;

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-6 sm:p-8">
                {/* Cabeçalho */}
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                        <Dices size={24} />
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
                        Roleta de Filmes
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Deixe a sorte decidir o que assistir hoje!
                    </p>
                </div>

                {!hasMovies ? (
                    <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                        Adicione filmes à lista de interesse para usar a roleta.
                    </div>
                ) : (
                    <>
                        {/* Resultado / Prévia */}
                        <div className="mt-6">
                            {result ? (
                                <div className="flex flex-col items-center gap-5 animate-scaleIn sm:flex-row sm:items-start">
                                    {/* Poster */}
                                    <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                                        {result.poster_path ? (
                                            <Image
                                                src={getPosterUrl(result.poster_path, "w342")}
                                                alt={result.title}
                                                fill
                                                sizes="160px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center p-2 text-center text-xs text-gray-400">
                                                Sem capa
                                            </span>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="min-w-0 text-center sm:text-left">
                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                            <Sparkles size={12} />
                                            Hoje é dia de ver!
                                        </div>
                                        <h4 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                                            {result.title}
                                        </h4>
                                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                            {result.release_date ? formatDate(result.release_date) : "Ano desconhecido"}
                                            {result.genres.length > 0 && ` · ${result.genres.join(", ")}`}
                                        </p>
                                        {result.overview && (
                                            <p className="mt-3 text-sm leading-relaxed text-gray-600 line-clamp-4 dark:text-gray-300">
                                                {result.overview}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                                    {/* Poster em rotação */}
                                    <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-lg ring-1 ring-gray-200 ring-2 dark:bg-gray-800 dark:ring-gray-700">
                                        {previewMovie?.poster_path ? (
                                            <Image
                                                src={getPosterUrl(previewMovie.poster_path, "w342")}
                                                alt={previewMovie?.title ?? ""}
                                                fill
                                                sizes="160px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center p-2 text-center text-xs text-gray-400">
                                                Sem capa
                                            </span>
                                        )}
                                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/70 to-transparent px-3 pb-2 pt-6 text-center text-xs font-semibold text-white">
                                            {previewMovie?.title}
                                        </span>
                                    </div>
                                    <div className="flex flex-1 flex-col items-center justify-center text-center sm:items-start sm:text-left">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {rolling
                                                ? "Girando a roleta..."
                                                : "Gire a roleta para sortear um filme da sua lista!"}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                                            {rolling ? "" : `${movies.length} ${movies.length === 1 ? "filme" : "filmes"}`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Vídeo da roleta (prévia rápida dos posters) */}
                        {rolling && (
                            <div className="mt-4 flex gap-2 overflow-hidden">
                                {movies.slice(0, 6).map((movie, i) => (
                                    <div
                                        key={movie.id}
                                        className={`relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-100 ${i === currentIndex % 6 ? "scale-110 ring-2 ring-indigo-400" : "opacity-40"
                                            }`}
                                    >
                                        {movie.poster_path ? (
                                            <Image
                                                src={getPosterUrl(movie.poster_path, "w342")}
                                                alt={movie.title}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center text-[8px] text-gray-400">
                                                Sem capa
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ações */}
                        <div className="mt-6 flex justify-center gap-3">
                            {!result && (
                                <button
                                    onClick={spin}
                                    disabled={rolling}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Dices size={16} className={rolling ? "animate-spin" : ""} />
                                    {rolling ? "Girando..." : "Girar roleta"}
                                </button>
                            )}
                            {result && (
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        setCurrentIndex(0);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-6 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                >
                                    <RotateCcw size={16} />
                                    Girar novamente
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}