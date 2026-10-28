"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Film, Loader2, Sparkles, Tv, X } from "lucide-react";
import Image from "next/image";
import type { Movie } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { Toast } from "@/components/ui/Toast";
import { MovieSearch } from "./MovieSearch";
import { cn } from "@/lib/cn";

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

function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function AddEntryForm() {
    const searchParams = useSearchParams();
    const urlTmdbId = searchParams.get("tmdbId");

    const { addEntry, users, reviews, watchlist, movies } = useReviews();

    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [loadingFromUrl, setLoadingFromUrl] = useState(false);
    const [dateWatched, setDateWatched] = useState(getTodayDateString);
    const [ratingUser1, setRatingUser1] = useState(0);
    const [ratingUser2, setRatingUser2] = useState(0);
    const [textReview, setTextReview] = useState("");
    const [platform, setPlatform] = useState("");
    // users[0] é seguro: o SetupRedirect só renderiza esta página com 2 usuários
    const [recommendedBy, setRecommendedBy] = useState(users[0]?.id ?? "");
    const [toastOpen, setToastOpen] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // Carrega filme automaticamente caso tmdbId venha na URL (ex: via Watchlist ou Roleta)
    useEffect(() => {
        if (!urlTmdbId || selectedMovie) return;

        const fromWatchlist = watchlist.find((m) => m.id === urlTmdbId);
        if (fromWatchlist) {
            setSelectedMovie(fromWatchlist);
            return;
        }

        const fromMovies = movies.find((m) => m.id === urlTmdbId);
        if (fromMovies) {
            setSelectedMovie(fromMovies);
            return;
        }

        let active = true;
        setLoadingFromUrl(true);
        fetch(`/api/movies/${urlTmdbId}`)
            .then((res) => {
                if (!res.ok) throw new Error("Filme não encontrado");
                return res.json();
            })
            .then((data) => {
                if (active && data.movie) {
                    setSelectedMovie(data.movie);
                }
            })
            .catch((err) => {
                console.error("Erro ao carregar filme via URL:", err);
            })
            .finally(() => {
                if (active) setLoadingFromUrl(false);
            });

        return () => {
            active = false;
        };
    }, [urlTmdbId, watchlist, movies, selectedMovie]);

    // Histórico de sessões anteriores deste filme (Rewatch)
    const previousSessions = useMemo(() => {
        if (!selectedMovie) return [];
        return reviews
            .filter((r) => r.movieId === selectedMovie.id)
            .sort((a, b) => b.dateWatched.localeCompare(a.dateWatched));
    }, [selectedMovie, reviews]);

    // Enquanto o onboarding não estiver completo, o SetupRedirect cuida do redirecionamento
    if (users.length !== 2) return null;

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie(movie);
        setToastOpen(false);
        setErrors([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
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

        setSaving(true);
        try {
            await addEntry({
                movie: selectedMovie!,
                dateWatched,
                ratingUser1,
                ratingUser2,
                textReview: textReview.trim(),
                platform: platform.trim() || undefined,
                recommendedBy
            });

            // Reset para novo registro
            setSelectedMovie(null);
            setDateWatched(getTodayDateString());
            setRatingUser1(0);
            setRatingUser2(0);
            setTextReview("");
            setPlatform("");
            setRecommendedBy(users[0].id);
            setErrors([]);
            setToastOpen(true);

            window.setTimeout(() => setToastOpen(false), 3000);
        } catch (error) {
            console.error("Erro ao salvar registro:", error);
            setErrors(["Não foi possível salvar o registro. Tente novamente."]);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800 sm:p-8">
            {loadingFromUrl && (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 size={20} className="mr-2 animate-spin text-indigo-600" />
                    Carregando detalhes do filme...
                </div>
            )}

            {!loadingFromUrl && !selectedMovie ? (
                <div>
                    <MovieSearch onSelect={handleSelectMovie} />
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        Digite pelo menos 2 caracteres para buscar na base do TMDB.
                    </p>
                </div>
            ) : !loadingFromUrl && selectedMovie && (
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

                    {/* Aviso de Reassistido (Rewatch) */}
                    {previousSessions.length > 0 && (
                        <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-amber-900 dark:border-amber-500/20 dark:text-amber-200">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <Sparkles size={14} className="shrink-0 text-amber-500" />
                                <span>
                                    Vocês já assistiram este filme em {formatDate(previousSessions[0].dateWatched)} ({previousSessions.length + 1}ª sessão)!
                                </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                                <span className="text-[11px] uppercase tracking-wider text-amber-600/90 dark:text-amber-400/80">
                                    Avaliação anterior:
                                </span>
                                <span className="font-medium">
                                    {users[0].name.split(" ")[0]}: {previousSessions[0].ratingUser1} ★
                                </span>
                                <span className="font-medium">
                                    {users[1].name.split(" ")[0]}: {previousSessions[0].ratingUser2} ★
                                </span>
                            </div>
                        </div>
                    )}

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
                        <div className="flex flex-wrap gap-2">
                            {PLATFORM_OPTIONS.map((item) => {
                                const isSelected = platform === item;
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setPlatform(isSelected ? "" : item)}
                                        className={cn(
                                            "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                                            isSelected
                                                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 ring-2 ring-indigo-600"
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
                            placeholder="Ou digite outro local/streaming (ex: Stremio, Blu-ray)..."
                            value={PLATFORM_OPTIONS.includes(platform) ? "" : platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            maxLength={50}
                            className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2 text-xs text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
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
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-surface-dark"
                        >
                            {saving && <Loader2 size={15} className="animate-spin" />}
                            {saving ? "Salvando..." : "Salvar registro"}
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
