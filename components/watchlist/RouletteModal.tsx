"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Dices, Film, Filter, PlayCircle, PlusCircle, RotateCcw, Sparkles, Tv, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Movie, User } from "@/types";
import { getPosterUrl } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export type DurationFilter = "all" | "short" | "medium" | "long";
export type RouletteMediaFilter = "all" | "movie" | "tv";

interface RouletteModalProps {
    open: boolean;
    onClose: () => void;
    movies: Movie[];
    users?: User[];
    initialGenre?: string;
    initialAddedBy?: string;
    initialDuration?: DurationFilter;
    initialMediaType?: RouletteMediaFilter;
}

const DURATION_OPTIONS: { id: DurationFilter; label: string }[] = [
    { id: "all", label: "Qualquer duração" },
    { id: "short", label: "Até 1h45" },
    { id: "medium", label: "Até 2h" },
    { id: "long", label: "+2h" }
];

export function matchesDuration(runtime: number | undefined, filter: DurationFilter): boolean {
    if (filter === "all") return true;
    if (!runtime || runtime <= 0) return false;
    if (filter === "short") return runtime <= 105;
    if (filter === "medium") return runtime <= 120;
    if (filter === "long") return runtime > 120;
    return true;
}

export function RouletteModal({
    open,
    onClose,
    movies,
    users = [],
    initialGenre = "all",
    initialAddedBy = "all",
    initialDuration = "all",
    initialMediaType = "all"
}: RouletteModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [result, setResult] = useState<Movie | null>(null);
    const [rolling, setRolling] = useState(false);
    const [selectedMediaType, setSelectedMediaType] =
        useState<RouletteMediaFilter>(initialMediaType);
    const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
    const [selectedAddedBy, setSelectedAddedBy] = useState<string>(initialAddedBy);
    const [selectedDuration, setSelectedDuration] = useState<DurationFilter>(initialDuration);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timersRef.current.forEach((t) => clearTimeout(t));
        timersRef.current = [];
    };

    const availableGenres = useMemo(() => {
        const set = new Set<string>();
        movies.forEach((m) => (m.genres ?? []).forEach((g) => set.add(g)));
        return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }, [movies]);

    const eligibleMovies = useMemo(() => {
        return movies.filter((m) => {
            const isTv = m.mediaType === "tv";
            const matchesType =
                selectedMediaType === "all" ||
                (selectedMediaType === "tv" ? isTv : !isTv);
            const matchesGenre = selectedGenre === "all" || (m.genres ?? []).includes(selectedGenre);
            const matchesUser = selectedAddedBy === "all" || m.addedBy === selectedAddedBy;
            const matchesTime = matchesDuration(m.runtime, selectedDuration);
            return matchesType && matchesGenre && matchesUser && matchesTime;
        });
    }, [movies, selectedMediaType, selectedGenre, selectedAddedBy, selectedDuration]);

    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
            setResult(null);
            setRolling(false);
            setSelectedMediaType(initialMediaType);
            setSelectedGenre(initialGenre);
            setSelectedAddedBy(initialAddedBy);
            setSelectedDuration(initialDuration);
        } else {
            clearTimers();
        }

        return () => clearTimers();
    }, [open, initialMediaType, initialGenre, initialAddedBy, initialDuration]);

    useEffect(() => {
        setCurrentIndex(0);
        setResult(null);
    }, [selectedMediaType, selectedGenre, selectedAddedBy, selectedDuration]);

    const spin = () => {
        if (eligibleMovies.length === 0 || rolling) return;

        setRolling(true);
        setResult(null);
        setCurrentIndex(0);
        clearTimers();

        const finalIndex = Math.floor(Math.random() * eligibleMovies.length);
        const steps = eligibleMovies.length * 2 + finalIndex + 1;

        const durations: number[] = [];
        for (let i = 0; i < steps; i++) {
            const progress = i / steps;
            durations.push(60 + progress * progress * 390);
        }

        let stepCount = 0;

        const tick = () => {
            const newIndex = (stepCount + 1) % eligibleMovies.length;
            setCurrentIndex(newIndex);
            stepCount += 1;

            if (stepCount >= steps) {
                setCurrentIndex(finalIndex);
                setResult(eligibleMovies[finalIndex]);
                setRolling(false);
                return;
            }

            const nextTimer = setTimeout(tick, durations[stepCount]);
            timersRef.current.push(nextTimer);
        };

        const firstTimer = setTimeout(tick, durations[0]);
        timersRef.current.push(firstTimer);
    };

    const previewMovie = result ?? eligibleMovies[currentIndex] ?? eligibleMovies[0];
    const hasMovies = eligibleMovies.length > 0;

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
                        Roleta de Filmes & Séries
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Deixe a sorte decidir o que assistir hoje!
                    </p>
                </div>

                {movies.length === 0 ? (
                    <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                        Adicione filmes ou séries à lista de interesse para usar a roleta.
                    </div>
                ) : (
                    <>
                        {/* Filtros de sorteio */}
                        {!result && (
                            <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-3.5 dark:bg-gray-800/40">
                                {/* Tipo de Mídia: Ambos | Filmes | Séries */}
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                    {(
                                        [
                                            { id: "all", label: "Ambos", icon: null },
                                            { id: "movie", label: "Filmes", icon: Film },
                                            { id: "tv", label: "Séries", icon: Tv }
                                        ] as const
                                    ).map((opt) => {
                                        const Icon = opt.icon;
                                        const active = selectedMediaType === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                disabled={rolling}
                                                onClick={() => setSelectedMediaType(opt.id)}
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                                                    active
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-card-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                                )}
                                            >
                                                {Icon && <Icon size={12} />}
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Quem adicionou & Duração */}
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    {users.length === 2 && (
                                        <div className="flex items-center gap-1">
                                            <Users size={12} className="text-gray-400" />
                                            <button
                                                type="button"
                                                disabled={rolling}
                                                onClick={() => setSelectedAddedBy("all")}
                                                className={cn(
                                                    "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                                                    selectedAddedBy === "all"
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-card-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                                )}
                                            >
                                                Ambos
                                            </button>
                                            {users.map((u) => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    disabled={rolling}
                                                    onClick={() => setSelectedAddedBy(u.id)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                                                        selectedAddedBy === u.id
                                                            ? "bg-indigo-600 text-white shadow-sm"
                                                            : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-card-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                                    )}
                                                >
                                                    <Avatar src={u.avatar} name={u.name} size="sm" className="h-3.5 w-3.5 text-[6px]" />
                                                    {u.name.split(" ")[0]}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1">
                                        <Clock size={12} className="text-gray-400" />
                                        {DURATION_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                disabled={rolling}
                                                onClick={() => setSelectedDuration(opt.id)}
                                                className={cn(
                                                    "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                                                    selectedDuration === opt.id
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-card-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Gênero */}
                                {availableGenres.length > 0 && (
                                    <div className="border-t border-gray-200/60 pt-2.5 dark:border-gray-700/50">
                                        <div className="mb-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-gray-400">
                                            <Filter size={11} />
                                            <span>Gênero:</span>
                                        </div>
                                        <div className="flex max-h-20 flex-wrap justify-center gap-1.5 overflow-y-auto">
                                            <button
                                                type="button"
                                                disabled={rolling}
                                                onClick={() => setSelectedGenre("all")}
                                                className={cn(
                                                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                                                    selectedGenre === "all"
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-card-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                                )}
                                            >
                                                Todos
                                            </button>
                                            {availableGenres.map((genre) => {
                                                const isSelected = selectedGenre === genre;
                                                return (
                                                    <button
                                                        key={genre}
                                                        type="button"
                                                        disabled={rolling}
                                                        onClick={() => setSelectedGenre(genre)}
                                                        className={cn(
                                                            "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                                                            isSelected
                                                                ? "bg-indigo-600 text-white shadow-sm"
                                                                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-card-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                                        )}
                                                    >
                                                        {genre}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                                {result.release_date ? result.release_date.slice(0, 4) : "Ano desconhecido"}
                                                {result.runtime && result.runtime > 0
                                                    ? ` · ${Math.floor(result.runtime / 60)}h ${result.runtime % 60}m`
                                                    : ""}
                                                {result.genres.length > 0 && ` · ${result.genres.join(", ")}`}
                                            </p>
                                            {result.overview && (
                                                <p className="mt-3 text-sm leading-relaxed text-gray-600 line-clamp-4 dark:text-gray-300">
                                                    {result.overview}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : !hasMovies ? (
                                    <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                                        Nenhum título na sua lista corresponde aos filtros selecionados.
                                    </div>
                                ) : (
                                    <motion.div
                                        key="preview"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-5 sm:flex-row sm:items-start"
                                    >
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
                                                    : selectedMediaType === "movie"
                                                    ? "Gire a roleta para sortear um filme da sua lista!"
                                                    : selectedMediaType === "tv"
                                                    ? "Gire a roleta para sortear uma série da sua lista!"
                                                    : "Gire a roleta para sortear o que assistir hoje!"}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                                                {rolling
                                                    ? ""
                                                    : `${eligibleMovies.length} ${
                                                          selectedMediaType === "movie"
                                                              ? eligibleMovies.length === 1
                                                                  ? "filme elegível"
                                                                  : "filmes elegíveis"
                                                              : selectedMediaType === "tv"
                                                              ? eligibleMovies.length === 1
                                                                  ? "série elegível"
                                                                  : "séries elegíveis"
                                                              : eligibleMovies.length === 1
                                                              ? "título elegível"
                                                              : "títulos elegíveis"
                                                      }`}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {rolling && (
                            <div className="mt-4 flex justify-center gap-2 overflow-hidden">
                                {eligibleMovies.slice(0, 6).map((movie, i) => (
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

                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            {!result && (
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={spin}
                                    disabled={rolling || !hasMovies}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/30 transition-all hover:shadow-accent-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Dices size={16} className={rolling ? "animate-spin" : ""} />
                                    {rolling ? "Girando..." : "Girar roleta"}
                                </motion.button>
                            )}
                            {result && (
                                <>
                                    {result.mediaType === "tv" ? (
                                        <>
                                            <Link
                                                href={`/adicionar?tmdbId=${result.id}&mediaType=tv&mode=watching`}
                                                onClick={onClose}
                                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/30 transition-all hover:shadow-accent-500/50"
                                            >
                                                <PlayCircle size={16} />
                                                Começar maratona!
                                            </Link>
                                            <Link
                                                href={`/adicionar?tmdbId=${result.id}&mediaType=tv`}
                                                onClick={onClose}
                                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300"
                                            >
                                                <PlusCircle size={16} />
                                                Já assistimos
                                            </Link>
                                        </>
                                    ) : (
                                        <Link
                                            href={`/adicionar?tmdbId=${result.id}`}
                                            onClick={onClose}
                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/30 transition-all hover:shadow-accent-500/50"
                                        >
                                            <PlusCircle size={16} />
                                            Assistir agora! (Registrar sessão)
                                        </Link>
                                    )}
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            setResult(null);
                                            setCurrentIndex(0);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gold-400/10 px-5 py-2.5 text-sm font-semibold text-gold-600 transition-colors hover:bg-gold-400/20 dark:text-gold-300"
                                    >
                                        <RotateCcw size={16} />
                                        Girar novamente
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
