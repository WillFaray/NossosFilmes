"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    BookmarkCheck,
    CheckCircle2,
    Clock,
    Film,
    FlagOff,
    Loader2,
    PlayCircle,
    Sparkles,
    Tv,
    X
} from "lucide-react";
import Image from "next/image";
import type { MediaType, Movie, TvSeason } from "@/types";
import { formatDate, getPosterUrl } from "@/lib/utils";
import { formatDuration, parseRuntimeInput } from "@/lib/runtime";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { StarRatingInput } from "@/components/ui/StarRatingInput";
import { Toast } from "@/components/ui/Toast";
import { WatchedDatesPicker } from "@/components/common/WatchedDatesPicker";
import { MovieSearch } from "./MovieSearch";
import { cn } from "@/lib/cn";

const PLATFORM_OPTIONS = [
    "Cinema",
    "Netflix",
    "Max",
    "Prime Video",
    "Disney+",
    "Apple TV+",
    "Globoplay",
    "Mubi",
    "Casa"
];

const ABANDON_REASONS = [
    "Ficou chata",
    "Ritmo muito lento",
    "Não prendeu a atenção",
    "História confusa",
    "Perdemos o interesse"
];

type SeriesEntryMode = "completed" | "watching" | "abandoned";

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
    const urlMediaType =
        (searchParams.get("mediaType") || searchParams.get("type")) === "tv"
            ? "tv"
            : "movie";
    const urlMode = searchParams.get("mode");

    const { addEntry, startSeriesProgress, users, reviews, watchlist, movies } =
        useReviews();

    const [mediaType, setMediaType] = useState<MediaType>(urlMediaType);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [loadingFromUrl, setLoadingFromUrl] = useState(false);
    const [loadingTvDetails, setLoadingTvDetails] = useState(false);

    // Campos de Filme / Comuns
    const [dateWatched, setDateWatched] = useState(getTodayDateString);
    const [ratingUser1, setRatingUser1] = useState(0);
    const [ratingUser2, setRatingUser2] = useState(0);
    const [textReview, setTextReview] = useState("");
    const [platform, setPlatform] = useState("");
    const [customRuntime, setCustomRuntime] = useState<string>("");
    const [recommendedBy, setRecommendedBy] = useState(users[0]?.id ?? "");
    const [removeWatchlistOnSave, setRemoveWatchlistOnSave] = useState(true);

    // Campos exclusivos de Série (TV)
    const [seriesMode, setSeriesMode] = useState<SeriesEntryMode>(
        urlMode === "watching" ? "watching" : "completed"
    );
    const [seasons, setSeasons] = useState<TvSeason[]>([]);
    // "complete" = Série Completa / Minissérie; número = temporada específica
    const [seasonScope, setSeasonScope] = useState<"complete" | number>(1);
    const [totalEpisodes, setTotalEpisodes] = useState<number>(8);
    const [episodesWatched, setEpisodesWatched] = useState<number>(8);
    const [currentEpisodeInProgress, setCurrentEpisodeInProgress] = useState<number>(0);
    const [runtimePerEpisode, setRuntimePerEpisode] = useState<string>("45");
    const [watchedDates, setWatchedDates] = useState<string[]>(() => [
        getTodayDateString()
    ]);
    const [abandonReasonChip, setAbandonReasonChip] = useState(ABANDON_REASONS[0]);
    const [customAbandonReason, setCustomAbandonReason] = useState("");

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const isTv =
        mediaType === "tv" || selectedMovie?.mediaType === "tv";

    // Atualiza duração quando um filme é selecionado
    useEffect(() => {
        if (!selectedMovie) {
            setCustomRuntime("");
            return;
        }
        if (selectedMovie.mediaType !== "tv" && mediaType !== "tv") {
            if (selectedMovie.runtime && selectedMovie.runtime > 0) {
                setCustomRuntime(String(selectedMovie.runtime));
            } else {
                setCustomRuntime("");
            }
        }
    }, [selectedMovie, mediaType]);

    // Busca detalhes completos das temporadas quando uma série de TV é selecionada
    useEffect(() => {
        if (!selectedMovie || (selectedMovie.mediaType !== "tv" && mediaType !== "tv")) {
            setSeasons([]);
            return;
        }

        let active = true;
        setLoadingTvDetails(true);
        fetch(`/api/tv/${selectedMovie.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!active || !data) return;
                const detail: Movie = data.tv || data.movie;
                if (!detail) return;

                const validSeasons = (detail.seasons || []).filter(
                    (s) => s.season_number > 0 && s.episode_count > 0
                );
                setSeasons(validSeasons);

                const epRuntime = detail.runtimePerEpisode || detail.runtime || 45;
                setRuntimePerEpisode(String(epRuntime));

                if (validSeasons.length > 0) {
                    const first = validSeasons[0];
                    setSeasonScope(first.season_number);
                    setTotalEpisodes(first.episode_count);
                    setEpisodesWatched(first.episode_count);
                } else {
                    const fallbackTotal = detail.numberOfEpisodes || 8;
                    setSeasonScope("complete");
                    setTotalEpisodes(fallbackTotal);
                    setEpisodesWatched(fallbackTotal);
                }

                setSelectedMovie((prev) =>
                    prev && prev.id === detail.id
                        ? {
                              ...prev,
                              ...detail,
                              mediaType: "tv"
                          }
                        : prev
                );
            })
            .catch(() => {
                // mantém os dados básicos da busca
            })
            .finally(() => {
                if (active) setLoadingTvDetails(false);
            });

        return () => {
            active = false;
        };
    }, [selectedMovie?.id, mediaType]);

    // Verifica se o item está na Lista de Interesse
    const isInWatchlist = useMemo(() => {
        return Boolean(
            selectedMovie && watchlist.some((m) => m.id === selectedMovie.id)
        );
    }, [selectedMovie, watchlist]);

    // Carrega obra automaticamente caso tmdbId venha na URL (ex: via Watchlist ou Roleta)
    useEffect(() => {
        if (!urlTmdbId || selectedMovie) return;

        const fromWatchlist = watchlist.find((m) => m.id === urlTmdbId);
        if (fromWatchlist) {
            if (fromWatchlist.mediaType === "tv" || urlMediaType === "tv") {
                setMediaType("tv");
            }
            setSelectedMovie({
                ...fromWatchlist,
                mediaType: fromWatchlist.mediaType || urlMediaType
            });
            return;
        }

        const fromMovies = movies.find((m) => m.id === urlTmdbId);
        if (fromMovies) {
            if (fromMovies.mediaType === "tv" || urlMediaType === "tv") {
                setMediaType("tv");
            }
            setSelectedMovie({
                ...fromMovies,
                mediaType: fromMovies.mediaType || urlMediaType
            });
            return;
        }

        let active = true;
        setLoadingFromUrl(true);
        const endpoint =
            urlMediaType === "tv"
                ? `/api/tv/${urlTmdbId}`
                : `/api/movies/${urlTmdbId}`;

        fetch(endpoint)
            .then((res) => {
                if (!res.ok) throw new Error("Obra não encontrada");
                return res.json();
            })
            .then((data) => {
                const item = data.tv || data.movie;
                if (active && item) {
                    if (urlMediaType === "tv" || item.mediaType === "tv") {
                        setMediaType("tv");
                    }
                    setSelectedMovie({
                        ...item,
                        mediaType: item.mediaType || urlMediaType
                    });
                }
            })
            .catch((err) => {
                console.error("Erro ao carregar obra via URL:", err);
            })
            .finally(() => {
                if (active) setLoadingFromUrl(false);
            });

        return () => {
            active = false;
        };
    }, [urlTmdbId, urlMediaType, watchlist, movies, selectedMovie]);

    // Histórico de sessões anteriores desta obra
    const previousSessions = useMemo(() => {
        if (!selectedMovie) return [];
        return reviews
            .filter((r) => r.movieId === selectedMovie.id)
            .sort((a, b) => b.dateWatched.localeCompare(a.dateWatched));
    }, [selectedMovie, reviews]);

    if (users.length !== 2) return null;

    const chosenSeasonObj =
        typeof seasonScope === "number"
            ? seasons.find((s) => s.season_number === seasonScope) ?? null
            : null;

    const activePosterPath =
        (isTv && chosenSeasonObj?.poster_path) ||
        selectedMovie?.poster_path ||
        "";

    const resolvedSeasonName = useMemo(() => {
        if (!isTv) return null;
        if (seasonScope === "complete") {
            return (selectedMovie?.numberOfSeasons ?? seasons.length) === 1
                ? "Minissérie"
                : "Série Completa";
        }
        return chosenSeasonObj?.name || `${seasonScope}ª Temporada`;
    }, [isTv, seasonScope, selectedMovie, seasons.length, chosenSeasonObj]);

    const parsedEpRuntime = parseRuntimeInput(runtimePerEpisode, 45);
    const seriesTotalMinutes = Math.max(1, episodesWatched) * parsedEpRuntime;

    const handleScopeChange = (newScope: "complete" | number) => {
        setSeasonScope(newScope);
        if (newScope === "complete") {
            const allEps =
                selectedMovie?.numberOfEpisodes ||
                seasons.reduce((acc, s) => acc + s.episode_count, 0) ||
                totalEpisodes;
            setTotalEpisodes(allEps);
            if (seriesMode === "completed") {
                setEpisodesWatched(allEps);
            }
        } else {
            const s = seasons.find((item) => item.season_number === newScope);
            if (s && s.episode_count > 0) {
                setTotalEpisodes(s.episode_count);
                if (seriesMode === "completed") {
                    setEpisodesWatched(s.episode_count);
                } else if (episodesWatched > s.episode_count) {
                    setEpisodesWatched(s.episode_count);
                }
            }
        }
    };

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie({
            ...movie,
            mediaType: isTv ? "tv" : (movie.mediaType || "movie")
        });
        setToastMessage(null);
        setErrors([]);
    };

    const resetForm = (msg: string) => {
        setSelectedMovie(null);
        setDateWatched(getTodayDateString());
        setWatchedDates([getTodayDateString()]);
        setRatingUser1(0);
        setRatingUser2(0);
        setTextReview("");
        setPlatform("");
        setCustomRuntime("");
        setRecommendedBy(users[0].id);
        setRemoveWatchlistOnSave(true);
        setCurrentEpisodeInProgress(0);
        setCustomAbandonReason("");
        setErrors([]);
        setToastMessage(msg);
        window.setTimeout(() => setToastMessage(null), 3500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        const validationErrors: string[] = [];
        if (!selectedMovie) {
            validationErrors.push(
                isTv ? "Selecione uma série." : "Selecione um filme."
            );
        }

        // MODO 1: Iniciar série em "Assistindo no momento"
        if (isTv && seriesMode === "watching") {
            if (totalEpisodes < 1) {
                validationErrors.push("O total de episódios deve ser no mínimo 1.");
            }
            if (validationErrors.length > 0) {
                setErrors(validationErrors);
                return;
            }

            setSaving(true);
            try {
                const shouldRemoveFromWatchlist =
                    isInWatchlist && removeWatchlistOnSave;
                const sNum =
                    typeof seasonScope === "number" ? seasonScope : 1;

                await startSeriesProgress({
                    tmdbId: selectedMovie!.id,
                    title: selectedMovie!.title || selectedMovie!.name || "Série",
                    posterPath: activePosterPath,
                    backdropPath: selectedMovie!.backdrop_path ?? null,
                    genres: selectedMovie!.genres || [],
                    overview:
                        chosenSeasonObj?.overview ||
                        selectedMovie!.overview ||
                        null,
                    firstAirDate:
                        selectedMovie!.first_air_date ||
                        selectedMovie!.release_date ||
                        null,
                    seasonNumber: sNum,
                    seasonName: resolvedSeasonName || `${sNum}ª Temporada`,
                    totalEpisodes: Math.max(1, totalEpisodes),
                    currentEpisode: Math.min(
                        totalEpisodes,
                        Math.max(0, currentEpisodeInProgress)
                    ),
                    runtimePerEpisode: parsedEpRuntime,
                    platform: platform.trim() || null,
                    removeFromWatchlist: shouldRemoveFromWatchlist
                });

                resetForm(
                    `"${selectedMovie!.title}" adicionada em Assistindo no momento!`
                );
            } catch (error) {
                console.error("Erro ao iniciar série:", error);
                setErrors([
                    "Não foi possível iniciar o acompanhamento da série."
                ]);
            } finally {
                setSaving(false);
            }
            return;
        }

        // MODO 2 e 3: Série Concluída / Abandonada OU Filme Concluído
        const finalAbandonReason =
            customAbandonReason.trim() || abandonReasonChip;

        if (isTv) {
            if (watchedDates.length === 0) {
                validationErrors.push(
                    "Selecione pelo menos um dia assistido no mini-calendário."
                );
            }
            if (seriesMode === "abandoned" && !finalAbandonReason) {
                validationErrors.push("Informe o motivo do abandono.");
            }
        } else {
            if (!dateWatched) {
                validationErrors.push("Informe a data assistida.");
            }
        }

        if (ratingUser1 === 0) {
            validationErrors.push(`Dê uma nota para ${users[0].name}.`);
        }
        if (ratingUser2 === 0) {
            validationErrors.push(`Dê uma nota para ${users[1].name}.`);
        }
        if (seriesMode !== "abandoned" && !textReview.trim()) {
            validationErrors.push("Escreva uma avaliação curta.");
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSaving(true);
        try {
            const shouldRemoveFromWatchlist =
                isInWatchlist && removeWatchlistOnSave;

            if (isTv) {
                const sortedDates = [...watchedDates].sort();
                const latestDate = sortedDates[sortedDates.length - 1];
                const effectiveReviewText =
                    textReview.trim() ||
                    (seriesMode === "abandoned"
                        ? `Série abandonada: ${finalAbandonReason}`
                        : "");

                await addEntry({
                    movie: {
                        ...selectedMovie!,
                        poster_path: activePosterPath,
                        mediaType: "tv",
                        runtime: seriesTotalMinutes,
                        runtimePerEpisode: parsedEpRuntime
                    },
                    dateWatched: latestDate,
                    ratingUser1,
                    ratingUser2,
                    textReview: effectiveReviewText,
                    platform: platform.trim() || undefined,
                    recommendedBy,
                    removeFromWatchlist: shouldRemoveFromWatchlist,
                    mediaType: "tv",
                    seasonNumber:
                        seasonScope === "complete" ? null : seasonScope,
                    seasonName: resolvedSeasonName,
                    totalEpisodes: Math.max(1, totalEpisodes),
                    episodesWatched: Math.max(1, episodesWatched),
                    runtimePerEpisode: parsedEpRuntime,
                    watchedDates: sortedDates,
                    status:
                        seriesMode === "abandoned" ? "abandoned" : "completed",
                    abandonedReason:
                        seriesMode === "abandoned" ? finalAbandonReason : null
                });

                resetForm(
                    seriesMode === "abandoned"
                        ? "Série registrada como abandonada no histórico!"
                        : "Temporada/série adicionada ao histórico!"
                );
            } else {
                const parsedRuntime = customRuntime.trim()
                    ? parseInt(customRuntime, 10)
                    : selectedMovie?.runtime;

                await addEntry({
                    movie: {
                        ...selectedMovie!,
                        mediaType: "movie",
                        runtime:
                            parsedRuntime && parsedRuntime > 0
                                ? parsedRuntime
                                : undefined
                    },
                    dateWatched,
                    ratingUser1,
                    ratingUser2,
                    textReview: textReview.trim(),
                    platform: platform.trim() || undefined,
                    recommendedBy,
                    removeFromWatchlist: shouldRemoveFromWatchlist,
                    mediaType: "movie"
                });

                resetForm("Filme adicionado ao histórico!");
            }
        } catch (error) {
            console.error("Erro ao salvar registro:", error);
            setErrors([
                "Não foi possível salvar o registro. Tente novamente."
            ]);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800 sm:p-8">
            {/* Abas Filme vs Série de TV */}
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
                <button
                    type="button"
                    onClick={() => {
                        setMediaType("movie");
                        if (selectedMovie?.mediaType === "tv") {
                            setSelectedMovie(null);
                        }
                        setErrors([]);
                    }}
                    className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                        !isTv
                            ? "bg-white text-indigo-600 shadow-sm dark:bg-card-dark dark:text-indigo-400"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                >
                    <Film size={16} />
                    Filme
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMediaType("tv");
                        if (selectedMovie && selectedMovie.mediaType !== "tv") {
                            setSelectedMovie(null);
                        }
                        setErrors([]);
                    }}
                    className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                        isTv
                            ? "bg-white text-indigo-600 shadow-sm dark:bg-card-dark dark:text-indigo-400"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                >
                    <Tv size={16} />
                    Série de TV
                </button>
            </div>

            {loadingFromUrl && (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2
                        size={20}
                        className="mr-2 animate-spin text-indigo-600"
                    />
                    Carregando detalhes da obra...
                </div>
            )}

            {!loadingFromUrl && !selectedMovie ? (
                <div>
                    <MovieSearch
                        onSelect={handleSelectMovie}
                        mediaType={mediaType}
                    />
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        Digite pelo menos 2 caracteres para buscar{" "}
                        {isTv ? "séries de TV" : "filmes"} na base do TMDB.
                    </p>
                </div>
            ) : (
                !loadingFromUrl &&
                selectedMovie && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Obra selecionada */}
                        <div className="flex items-start gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                                {activePosterPath ? (
                                    <Image
                                        src={getPosterUrl(activePosterPath, "w342")}
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
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                        {selectedMovie.title}
                                    </h3>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                        {isTv ? <Tv size={11} /> : <Film size={11} />}
                                        {isTv ? "Série" : "Filme"}
                                    </span>
                                    {loadingTvDetails && (
                                        <span className="inline-flex items-center gap-1 text-xs text-indigo-500">
                                            <Loader2 size={12} className="animate-spin" />
                                            Carregando temporadas...
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                    {(
                                        selectedMovie.release_date ||
                                        selectedMovie.first_air_date ||
                                        ""
                                    ).slice(0, 4) || "Ano desconhecido"}
                                    {selectedMovie.genres.length > 0 &&
                                        ` · ${selectedMovie.genres.join(", ")}`}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMovie(null)}
                                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                >
                                    <X size={14} />
                                    Trocar {isTv ? "série" : "filme"}
                                </button>
                            </div>
                        </div>

                        {/* Aviso de Reassistido (Rewatch / Temporadas anteriores) */}
                        {previousSessions.length > 0 && (
                            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-amber-900 dark:border-amber-500/20 dark:text-amber-200">
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <Sparkles
                                        size={14}
                                        className="shrink-0 text-amber-500"
                                    />
                                    <span>
                                        {isTv
                                            ? `Vocês já têm ${previousSessions.length} registro(s) desta série (último em ${formatDate(previousSessions[0].dateWatched)})!`
                                            : `Vocês já assistiram este filme em ${formatDate(previousSessions[0].dateWatched)} (${previousSessions.length + 1}ª sessão)!`}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                                    <span className="text-[11px] uppercase tracking-wider text-amber-600/90 dark:text-amber-400/80">
                                        Última avaliação:
                                    </span>
                                    <span className="font-medium">
                                        {users[0].name.split(" ")[0]}:{" "}
                                        {previousSessions[0].ratingUser1} ★
                                    </span>
                                    <span className="font-medium">
                                        {users[1].name.split(" ")[0]}:{" "}
                                        {previousSessions[0].ratingUser2} ★
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* CONTROLES EXCLUSIVOS DE SÉRIES DE TV */}
                        {isTv && (
                            <div className="space-y-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 sm:p-5 dark:border-indigo-500/15 dark:bg-indigo-950/10">
                                {/* Modo de Registro da Série */}
                                <fieldset>
                                    <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                                        Como desejam registrar esta série?
                                    </legend>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <button
                                            type="button"
                                            onClick={() => setSeriesMode("completed")}
                                            className={cn(
                                                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                                                seriesMode === "completed"
                                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark dark:text-gray-200"
                                            )}
                                        >
                                            <CheckCircle2 size={15} />
                                            Já assistimos (Avaliar)
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSeriesMode("watching")}
                                            className={cn(
                                                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                                                seriesMode === "watching"
                                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark dark:text-gray-200"
                                            )}
                                        >
                                            <PlayCircle size={15} />
                                            Assistindo no momento
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSeriesMode("abandoned")}
                                            className={cn(
                                                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                                                seriesMode === "abandoned"
                                                    ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-card-dark dark:text-gray-200"
                                            )}
                                        >
                                            <FlagOff size={15} />
                                            Abandonamos
                                        </button>
                                    </div>
                                </fieldset>

                                {/* Seleção de Temporada vs Série Completa / Minissérie */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="seasonScopeSelect"
                                            className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200"
                                        >
                                            Temporada ou Série Completa
                                        </label>
                                        <select
                                            id="seasonScopeSelect"
                                            value={String(seasonScope)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleScopeChange(
                                                    val === "complete"
                                                        ? "complete"
                                                        : Number(val)
                                                );
                                            }}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-card-dark dark:text-white"
                                        >
                                            {seasons.map((s) => (
                                                <option
                                                    key={s.season_number}
                                                    value={s.season_number}
                                                >
                                                    {s.name} ({s.episode_count}{" "}
                                                    {s.episode_count === 1
                                                        ? "episódio"
                                                        : "episódios"}
                                                    )
                                                </option>
                                            ))}
                                            <option value="complete">
                                                {(selectedMovie.numberOfSeasons ??
                                                    seasons.length) === 1
                                                    ? "Minissérie / Série Completa"
                                                    : "Série Completa (Todas as temporadas)"}
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="totalEpisodesInput"
                                            className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200"
                                        >
                                            Total de episódios
                                        </label>
                                        <input
                                            id="totalEpisodesInput"
                                            type="number"
                                            min={1}
                                            max={2000}
                                            value={totalEpisodes}
                                            onChange={(e) => {
                                                const val = Math.max(
                                                    1,
                                                    Number(e.target.value)
                                                );
                                                setTotalEpisodes(val);
                                                if (seriesMode === "completed") {
                                                    setEpisodesWatched(val);
                                                }
                                            }}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-card-dark dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Campos específicos por modo */}
                                {seriesMode === "watching" ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="currentEpInProgress"
                                                className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200"
                                            >
                                                Episódios já vistos (opcional)
                                            </label>
                                            <input
                                                id="currentEpInProgress"
                                                type="number"
                                                min={0}
                                                max={totalEpisodes}
                                                value={currentEpisodeInProgress}
                                                onChange={(e) =>
                                                    setCurrentEpisodeInProgress(
                                                        Number(e.target.value)
                                                    )
                                                }
                                                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-card-dark dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="epRuntimeWatching"
                                                className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200"
                                            >
                                                Duração média por episódio (min)
                                            </label>
                                            <input
                                                id="epRuntimeWatching"
                                                type="number"
                                                min={1}
                                                max={300}
                                                value={runtimePerEpisode}
                                                onChange={(e) =>
                                                    setRuntimePerEpisode(e.target.value)
                                                }
                                                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-card-dark dark:text-white"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Episódios assistidos & Minutos por episódio */}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label
                                                    htmlFor="episodesWatchedInput"
                                                    className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200"
                                                >
                                                    Episódios assistidos (de {totalEpisodes})
                                                </label>
                                                <input
                                                    id="episodesWatchedInput"
                                                    type="number"
                                                    min={1}
                                                    max={totalEpisodes}
                                                    value={episodesWatched}
                                                    onChange={(e) =>
                                                        setEpisodesWatched(
                                                            Math.min(
                                                                totalEpisodes,
                                                                Math.max(
                                                                    1,
                                                                    Number(e.target.value)
                                                                )
                                                            )
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-card-dark dark:text-white"
                                                />
                                            </div>

                                            <div>
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <label
                                                        htmlFor="runtimePerEpInput"
                                                        className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
                                                    >
                                                        <Clock size={13} />
                                                        Minutos por episódio
                                                    </label>
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                        Total: {formatDuration(seriesTotalMinutes)}
                                                    </span>
                                                </div>
                                                <input
                                                    id="runtimePerEpInput"
                                                    type="number"
                                                    min={1}
                                                    max={300}
                                                    value={runtimePerEpisode}
                                                    onChange={(e) =>
                                                        setRuntimePerEpisode(e.target.value)
                                                    }
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-card-dark dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Motivo do abandono caso seriesMode === "abandoned" */}
                                        {seriesMode === "abandoned" && (
                                            <div className="space-y-2 rounded-xl bg-amber-50/70 p-3.5 dark:bg-amber-500/10">
                                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                                    Motivo rápido do abandono
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ABANDON_REASONS.map((r) => {
                                                        const active =
                                                            !customAbandonReason.trim() &&
                                                            abandonReasonChip === r;
                                                        return (
                                                            <button
                                                                key={r}
                                                                type="button"
                                                                onClick={() => {
                                                                    setAbandonReasonChip(r);
                                                                    setCustomAbandonReason("");
                                                                }}
                                                                className={cn(
                                                                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                                                                    active
                                                                        ? "bg-amber-600 text-white"
                                                                        : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200"
                                                                )}
                                                            >
                                                                {r}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={customAbandonReason}
                                                    onChange={(e) =>
                                                        setCustomAbandonReason(
                                                            e.target.value
                                                        )
                                                    }
                                                    maxLength={80}
                                                    placeholder="Ou digite outro motivo..."
                                                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-amber-500/30 dark:bg-gray-900 dark:text-white"
                                                />
                                            </div>
                                        )}

                                        {/* Mini-Calendário Interativo para marcar os dias da maratona */}
                                        <WatchedDatesPicker
                                            selectedDates={watchedDates}
                                            onChange={setWatchedDates}
                                            label="Dias em que assistiram"
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Data assistida e Duração (apenas para Filmes) */}
                        {!isTv && (
                            <>
                                <div>
                                    <label
                                        htmlFor="dateWatched"
                                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200"
                                    >
                                        Data assistida
                                    </label>
                                    <input
                                        id="dateWatched"
                                        type="date"
                                        value={dateWatched}
                                        onChange={(e) =>
                                            setDateWatched(e.target.value)
                                        }
                                        className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700 [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>

                                <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <label
                                            htmlFor="customRuntime"
                                            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200"
                                        >
                                            <Clock
                                                size={15}
                                                className="text-gray-400"
                                            />
                                            Duração
                                        </label>
                                        {customRuntime &&
                                            parseInt(customRuntime, 10) > 0 && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {Math.floor(
                                                        parseInt(
                                                            customRuntime,
                                                            10
                                                        ) / 60
                                                    )}
                                                    h{" "}
                                                    {parseInt(
                                                        customRuntime,
                                                        10
                                                    ) % 60}
                                                    m
                                                    {selectedMovie?.runtime &&
                                                    parseInt(
                                                        customRuntime,
                                                        10
                                                    ) !== selectedMovie.runtime
                                                        ? " (versão estendida / corte do diretor)"
                                                        : ""}
                                                </span>
                                            )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            id="customRuntime"
                                            type="number"
                                            min={1}
                                            max={999}
                                            value={customRuntime}
                                            onChange={(e) =>
                                                setCustomRuntime(e.target.value)
                                            }
                                            placeholder="Duração em minutos (ex: 120)"
                                            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                                        />
                                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                            min
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                                        Preenchido pelo TMDB. Ajuste livremente
                                        caso tenham visto uma versão estendida.
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Onde assistiram? (Opcional - comum para todos os modos) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <Tv size={15} className="text-gray-400" />
                                    Onde {isTv && seriesMode === "watching" ? "estão assistindo?" : "assistiram?"}{" "}
                                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                                        (opcional)
                                    </span>
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
                                            onClick={() =>
                                                setPlatform(
                                                    isSelected ? "" : item
                                                )
                                            }
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
                                value={
                                    PLATFORM_OPTIONS.includes(platform)
                                        ? ""
                                        : platform
                                }
                                onChange={(e) => setPlatform(e.target.value)}
                                maxLength={50}
                                className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2 text-xs text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                            />
                        </div>

                        {/* Notas, Avaliação e Quem Indicou (apenas quando não está apenas iniciando em andamento) */}
                        {!(isTv && seriesMode === "watching") && (
                            <>
                                {/* Notas dos usuários */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Avatar
                                                src={users[0].avatar}
                                                name={users[0].name}
                                                size="sm"
                                            />
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
                                            <Avatar
                                                src={users[1].avatar}
                                                name={users[1].name}
                                                size="sm"
                                            />
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
                                    <label
                                        htmlFor="textReview"
                                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200"
                                    >
                                        Avaliação curta{" "}
                                        {isTv && seriesMode === "abandoned" && (
                                            <span className="text-xs font-normal text-gray-400">
                                                (opcional para abandono)
                                            </span>
                                        )}
                                    </label>
                                    <textarea
                                        id="textReview"
                                        value={textReview}
                                        onChange={(e) =>
                                            setTextReview(e.target.value)
                                        }
                                        rows={3}
                                        maxLength={280}
                                        placeholder={
                                            isTv
                                                ? "O que acharam da temporada / série?"
                                                : "O que acharam do filme?"
                                        }
                                        className="w-full resize-none rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                                    />
                                    <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
                                        {textReview.length}/280
                                    </p>
                                </div>

                                {/* Quem indicou? */}
                                <fieldset>
                                    <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Quem indicou?
                                    </legend>
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
                                                    checked={
                                                        recommendedBy ===
                                                        user.id
                                                    }
                                                    onChange={() =>
                                                        setRecommendedBy(
                                                            user.id
                                                        )
                                                    }
                                                    className="sr-only"
                                                />
                                                <Avatar
                                                    src={user.avatar}
                                                    name={user.name}
                                                    size="sm"
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {user.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </>
                        )}

                        {/* Opção para remover da Watchlist se estiver na lista */}
                        {isInWatchlist && (
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-3.5 text-xs text-indigo-950 transition-colors hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-200 dark:hover:bg-indigo-500/10">
                                <input
                                    type="checkbox"
                                    checked={removeWatchlistOnSave}
                                    onChange={(e) =>
                                        setRemoveWatchlistOnSave(
                                            e.target.checked
                                        )
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                                />
                                <div className="flex items-center gap-2">
                                    <BookmarkCheck
                                        size={16}
                                        className="shrink-0 text-indigo-600 dark:text-indigo-400"
                                    />
                                    <span>
                                        Remover esta {isTv ? "série" : "obra"} da{" "}
                                        <strong>Lista de Interesse</strong>{" "}
                                        {isTv && seriesMode === "watching"
                                            ? "ao iniciar o acompanhamento"
                                            : "após salvar o registro"}
                                    </span>
                                </div>
                            </label>
                        )}

                        {/* Erros */}
                        {errors.length > 0 && (
                            <ul
                                role="alert"
                                className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            >
                                {errors.map((error) => (
                                    <li
                                        key={error}
                                        className="flex items-center gap-2"
                                    >
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
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-surface-dark",
                                    isTv && seriesMode === "abandoned"
                                        ? "bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-500"
                                        : "bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-500"
                                )}
                            >
                                {saving && (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                )}
                                {saving
                                    ? "Salvando..."
                                    : isTv && seriesMode === "watching"
                                    ? "Começar a assistir"
                                    : isTv && seriesMode === "abandoned"
                                    ? "Registrar como abandonada"
                                    : "Salvar registro"}
                            </button>
                        </div>
                    </form>
                )
            )}

            {/* Toast de sucesso */}
            <Toast
                open={Boolean(toastMessage)}
                message={toastMessage ?? ""}
                onClose={() => setToastMessage(null)}
            />
        </div>
    );
}
