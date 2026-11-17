"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Clock, Loader2, PlayCircle, PlusCircle, Trash2, Tv, X } from "lucide-react";
import type { Movie, User } from "@/types";
import { getPosterUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

interface MovieCardProps {
    movie: Movie;
    addedByUser?: User;
    className?: string;
    index?: number;
    onSelect?: (movie: Movie) => void;
    onRemove?: (movie: Movie) => void | Promise<void>;
}

export function MovieCard({
    movie,
    addedByUser,
    className = "",
    index = 0,
    onSelect,
    onRemove
}: MovieCardProps) {
    const [confirming, setConfirming] = useState(false);
    const [removing, setRemoving] = useState(false);

    const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : null;
    const isTv = movie.mediaType === "tv";
    const addUrl = isTv
        ? `/adicionar?tmdbId=${movie.id}&mediaType=tv`
        : `/adicionar?tmdbId=${movie.id}`;

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!removing) setConfirming(true);
    };

    const handleCancelRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirming(false);
    };

    const handleConfirmRemove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onRemove || removing) return;
        setRemoving(true);
        try {
            await onRemove(movie);
            setConfirming(false);
        } catch (error) {
            console.error("Erro ao remover da lista:", error);
        } finally {
            setRemoving(false);
        }
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25), ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md hover:ring-indigo-300 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50 ${className}`}
        >
            <div
                onClick={() => !confirming && onSelect?.(movie)}
                className={`relative aspect-[2/3] overflow-hidden bg-gray-200 dark:bg-gray-800 ${onSelect ? "cursor-pointer" : ""}`}
            >
                {movie.poster_path ? (
                    <Image
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                ) : (
                    <span className="flex h-full items-center justify-center p-3 text-center text-xs text-gray-400">
                        Sem capa
                    </span>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Selo de Série */}
                {isTv && !confirming && (
                    <div className="pointer-events-none absolute bottom-2 right-2 z-[4] flex items-center gap-1 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                        <Tv size={10} />
                        <span>
                            {movie.numberOfSeasons
                                ? `${movie.numberOfSeasons} temp.`
                                : "Série"}
                        </span>
                    </div>
                )}

                {/* Quem adicionou (badge discreto no canto inferior esquerdo do pôster) */}
                {addedByUser && !confirming && (
                    <div
                        className="pointer-events-none absolute bottom-2 left-2 z-[4] flex items-center gap-1 rounded-full bg-gray-900/75 py-0.5 pl-0.5 pr-2 text-[10px] font-medium text-white backdrop-blur-sm"
                        title={`Adicionado por ${addedByUser.name}`}
                    >
                        <Avatar
                            src={addedByUser.avatar}
                            name={addedByUser.name}
                            size="sm"
                            className="h-4 w-4 text-[7px]"
                        />
                        <span>{addedByUser.name.split(" ")[0]}</span>
                    </div>
                )}

                {/* Remoção: confirmação + loading */}
                {onRemove && confirming && (
                    <div
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm"
                        role="alertdialog"
                        aria-label={`Remover ${movie.title} da lista?`}
                    >
                        {removing ? (
                            <>
                                <Loader2 size={22} className="animate-spin text-white" />
                                <span className="text-xs font-medium text-white">Removendo...</span>
                            </>
                        ) : (
                            <>
                                <p className="px-3 text-center text-xs font-medium leading-snug text-white">
                                    Remover da lista?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCancelRemove}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                                        aria-label="Cancelar"
                                        title="Cancelar"
                                    >
                                        <X size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmRemove}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
                                        aria-label="Confirmar remoção"
                                        title="Confirmar"
                                    >
                                        <Check size={15} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Botão registrar sessão */}
                {!confirming && (
                    <Link
                        href={addUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-2 top-2 z-[5] inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 group-hover:opacity-100"
                        aria-label={`Registrar sessão de ${movie.title}`}
                        title="Registrar que assistimos"
                    >
                        <PlusCircle size={15} />
                    </Link>
                )}

                {/* Botão remover */}
                {onRemove && !confirming && (
                    <button
                        type="button"
                        onClick={handleRemoveClick}
                        disabled={removing}
                        className="absolute right-2 top-2 z-[5] inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 group-hover:opacity-100"
                        aria-label={`Remover ${movie.title} da lista`}
                        title="Remover da lista"
                    >
                        <Trash2 size={15} />
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1 p-4">
                <button
                    type="button"
                    onClick={() => onSelect?.(movie)}
                    className="text-left focus:outline-none"
                >
                    <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                        {movie.title}
                    </h3>
                </button>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {releaseYear && <span>{releaseYear}</span>}
                    {releaseYear && movie.runtime && movie.runtime > 0 ? <span>·</span> : null}
                    {movie.runtime && movie.runtime > 0 ? (
                        <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            {isTv
                                ? `~${movie.runtime}m/ep`
                                : Math.floor(movie.runtime / 60) > 0
                                ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
                                : `${movie.runtime}m`}
                        </span>
                    ) : null}
                </div>

                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    {movie.genres.slice(0, 3).map((genre) => (
                        <span
                            key={genre}
                            className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                            {genre}
                        </span>
                    ))}
                </div>

                {/* Ações rápidas */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-2.5 dark:border-gray-800">
                    {isTv ? (
                        <>
                            <Link
                                href={`/adicionar?tmdbId=${movie.id}&mediaType=tv&mode=watching`}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-600 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500"
                            >
                                <PlayCircle size={13} />
                                Começar
                            </Link>
                            <Link
                                href={addUrl}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-50 py-1.5 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                            >
                                <Check size={13} />
                                Já vimos
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={addUrl}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                            <Check size={14} />
                            Já assistimos!
                        </Link>
                    )}
                </div>
            </div>
        </motion.article>
    );
}
