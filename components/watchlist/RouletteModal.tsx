"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

        // Total de passos para dar sensação de duração (2 a 3 voltas completas)
        const steps = movies.length * 2 + finalIndex + 1;

        const durations: number[] = [];
        // Easing: começa rápido e desacelera gradativamente (de 60ms até 450ms)
        for (let i = 0; i < steps; i++) {
            const progress = i / steps;
            durations.push(60 + progress * progress * 390);
        }

        let stepCount = 0;

        const tick = () => {
            const newIndex = (stepCount + 1) % movies.length;
            setCurrentIndex(newIndex);
            stepCount += 1;

            if (stepCount >= steps) {
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
                    <motion.div
                        animate={rolling ? { rotate: 360, scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }}
                        transition={rolling ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0.4 }}
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/40"
                    >
                        <Dices size={24} />
                    </motion.div>
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
                            <AnimatePresence mode="wait">
                                {result ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
                                        className="flex flex-col items-center gap-5 rounded-3xl border border-gold-400/30 bg-gold-400/5 p-4 shadow-[0_0_40px_-8px_rgba(240,180,50,0.3)] sm:flex-row sm:items-start"
                                    >
                                        {/* Poster */}
                                        <motion.div
                                            initial={{ rotateY: 90, opacity: 0 }}
                                            animate={{ rotateY: 0, opacity: 1 }}
                                            transition={{ duration: 0.6, delay: 0.2 }}
                                            className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-poster-lg ring-1 ring-gold-400/40 dark:bg-gray-800"
                                        >
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
                                        </motion.div>
                                        {/* Info */}
                                        <div className="min-w-0 text-center sm:text-left">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", delay: 0.35, duration: 0.5 }}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold text-gold-500 dark:text-gold-300"
                                            >
                                                <Sparkles size={12} />
                                                Hoje é dia de ver!
                                            </motion.div>
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
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="preview"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-5 sm:flex-row sm:items-start"
                                    >
                                        {/* Poster em rotação */}
                                        <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-poster ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
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
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Vídeo da roleta (prévia rápida dos posters) */}
                        {rolling && (
                            <div className="mt-4 flex justify-center gap-2 overflow-hidden">
                                {movies.slice(0, 6).map((movie, i) => (
                                    <motion.div
                                        key={movie.id}
                                        animate={i === currentIndex % 6 ? { scale: 1.15, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
                                        transition={{ duration: 0.1 }}
                                        className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
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
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Ações */}
                        <div className="mt-6 flex justify-center gap-3">
                            {!result && (
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={spin}
                                    disabled={rolling}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/30 transition-all hover:shadow-accent-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Dices size={16} className={rolling ? "animate-spin" : ""} />
                                    {rolling ? "Girando..." : "Girar roleta"}
                                </motion.button>
                            )}
                            {result && (
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        setResult(null);
                                        setCurrentIndex(0);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gold-400/10 px-6 py-2.5 text-sm font-semibold text-gold-600 transition-colors hover:bg-gold-400/20 dark:text-gold-300"
                                >
                                    <RotateCcw size={16} />
                                    Girar novamente
                                </motion.button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}