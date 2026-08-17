"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Movie } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";

interface MovieCardProps {
    movie: Movie;
    className?: string;
    index?: number;
}

export function MovieCard({ movie, className = "", index = 0 }: MovieCardProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white/70 shadow-poster backdrop-blur-xl transition-shadow duration-300 hover:shadow-poster-lg dark:border-white/10 dark:bg-white/[0.05] ${className}`}
        >
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-200 dark:bg-gray-800">
                {movie.poster_path ? (
                    <Image
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                ) : (
                    <span className="flex h-full items-center justify-center p-3 text-center text-xs text-gray-400">
                        Sem capa
                    </span>
                )}
                {/* Brilho sutil no hover */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-4">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                    {movie.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(movie.release_date)}
                </p>
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    {movie.genres.slice(0, 3).map((genre) => (
                        <span
                            key={genre}
                            className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-medium text-gold-700 dark:bg-gold-400/10 dark:text-gold-300"
                        >
                            {genre}
                        </span>
                    ))}
                </div>
            </div>
        </motion.article>
    );
}