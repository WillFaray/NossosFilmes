"use client";

import { useState } from "react";
import { Check, Clock, ExternalLink, Film, Loader2, PlayCircle, Trash2, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Movie, User } from "@/types";
import { getPosterUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";

interface WatchlistDetailModalProps {
    open: boolean;
    onClose: () => void;
    movie: Movie | null;
    addedByUser?: User;
    onRemove: (movieId: string) => Promise<void>;
}

export function WatchlistDetailModal({
    open,
    onClose,
    movie,
    addedByUser,
    onRemove
}: WatchlistDetailModalProps) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [removing, setRemoving] = useState(false);

    if (!movie) return null;

    const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : null;
    const isTv = movie.mediaType === "tv";

    const handleConfirmRemove = async () => {
        if (removing) return;
        setRemoving(true);
        try {
            await onRemove(movie.id);
            setConfirmRemove(false);
            onClose();
        } catch (err) {
            console.error("Erro ao remover da lista:", err);
        } finally {
            setRemoving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={() => {
                setConfirmRemove(false);
                onClose();
            }}
        >
            <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row">
                    {/* Poster */}
                    <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl bg-gray-200 shadow-md dark:bg-gray-800 sm:mx-0">
                        {movie.poster_path ? (
                            <Image
                                src={getPosterUrl(movie.poster_path)}
                                alt={movie.title}
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

                    {/* Detalhes */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                        {isTv ? <Tv size={11} /> : <Film size={11} />}
                                        {isTv ? "Série de TV" : "Filme"}
                                    </span>
                                    {isTv && movie.numberOfSeasons && (
                                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            {movie.numberOfSeasons}{" "}
                                            {movie.numberOfSeasons === 1 ? "temporada" : "temporadas"}
                                            {movie.numberOfEpisodes
                                                ? ` (${movie.numberOfEpisodes} eps)`
                                                : ""}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {movie.title}
                                    {releaseYear && (
                                        <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">
                                            ({releaseYear})
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <a
                                href={`https://www.themoviedb.org/${isTv ? "tv" : "movie"}/${movie.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver no TMDB"
                                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                            >
                                TMDB
                                <ExternalLink size={11} />
                            </a>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {movie.runtime && movie.runtime > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    <Clock size={11} />
                                    {isTv
                                        ? `~${movie.runtime}m por episódio`
                                        : Math.floor(movie.runtime / 60) > 0
                                        ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
                                        : `${movie.runtime}m`}
                                </span>
                            )}

                            {addedByUser && (
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    <Avatar
                                        src={addedByUser.avatar}
                                        name={addedByUser.name}
                                        size="sm"
                                        className="h-3.5 w-3.5 text-[6px]"
                                    />
                                    Adicionado por {addedByUser.name.split(" ")[0]}
                                </span>
                            )}
                        </div>

                        {movie.genres.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {movie.genres.map((genre) => (
                                    <span
                                        key={genre}
                                        className="rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}

                        {movie.overview ? (
                            <div className="mt-4">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Sinopse
                                </p>
                                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                                    {movie.overview}
                                </p>
                            </div>
                        ) : (
                            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                                Sinopse não disponível para este título.
                            </p>
                        )}
                    </div>
                </div>

                {/* Ações */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                    {confirmRemove ? (
                        <div className="flex w-full flex-wrap items-center justify-between gap-3">
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                Remover {isTv ? "esta série" : "este filme"} da Lista de Interesse?
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={removing}
                                    onClick={() => setConfirmRemove(false)}
                                    className="rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={removing}
                                    onClick={handleConfirmRemove}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                                >
                                    {removing && <Loader2 size={13} className="animate-spin" />}
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setConfirmRemove(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                                <Trash2 size={14} />
                                Remover da lista
                            </button>

                            <div className="flex flex-wrap items-center gap-2">
                                {isTv && (
                                    <Link
                                        href={`/adicionar?tmdbId=${movie.id}&mediaType=tv&mode=watching`}
                                        onClick={onClose}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                                    >
                                        <PlayCircle size={14} />
                                        Começar a assistir
                                    </Link>
                                )}
                                <Link
                                    href={
                                        isTv
                                            ? `/adicionar?tmdbId=${movie.id}&mediaType=tv`
                                            : `/adicionar?tmdbId=${movie.id}`
                                    }
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                                >
                                    <Check size={14} />
                                    Já assistimos! (Avaliar)
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
