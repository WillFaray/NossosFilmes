import Image from "next/image";
import type { Movie } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";

interface MovieCardProps {
    movie: Movie;
    className?: string;
}

export function MovieCard({ movie, className = "" }: MovieCardProps) {
    return (
        <article className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-indigo-300 dark:bg-card-dark dark:ring-gray-800 dark:hover:ring-indigo-500/50 ${className}`}>
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-200 dark:bg-gray-800">
                {movie.poster_path ? (
                    <Image
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <span className="flex h-full items-center justify-center p-3 text-center text-xs text-gray-400">
                        Sem capa
                    </span>
                )}
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
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        >
                            {genre}
                        </span>
                    ))}
                </div>
            </div>
        </article>
    );
}