"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Search, Tv } from "lucide-react";
import type { DbSeriesProgressWithCheckins, Movie, TvSeason } from "@/types";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Modal } from "@/components/ui/Modal";
import { getPosterUrl } from "@/lib/utils";
import { cn } from "@/lib/cn";
import { InProgressCard } from "./InProgressCard";
import { CheckInModal } from "./CheckInModal";
import { CompleteSeriesModal } from "./CompleteSeriesModal";
import { AbandonSeriesModal } from "./AbandonSeriesModal";

const PLATFORM_OPTIONS = [
    "Netflix",
    "Max",
    "Prime Video",
    "Disney+",
    "Apple TV+",
    "Globoplay",
    "Mubi"
];

export function InProgressSection() {
    const { seriesProgress, startSeriesProgress, watchlist } = useReviews();

    const [checkInTarget, setCheckInTarget] =
        useState<DbSeriesProgressWithCheckins | null>(null);
    const [completeTarget, setCompleteTarget] =
        useState<DbSeriesProgressWithCheckins | null>(null);
    const [abandonTarget, setAbandonTarget] =
        useState<DbSeriesProgressWithCheckins | null>(null);

    // Modal para adicionar nova série diretamente em "Assistindo no momento"
    const [startOpen, setStartOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Movie[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedTv, setSelectedTv] = useState<Movie | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [seasons, setSeasons] = useState<TvSeason[]>([]);
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
    const [totalEpisodes, setTotalEpisodes] = useState<number>(8);
    const [runtimePerEpisode, setRuntimePerEpisode] = useState<number>(45);
    const [platform, setPlatform] = useState<string>("");
    const [removeFromWl, setRemoveFromWl] = useState<boolean>(true);
    const [starting, setStarting] = useState(false);

    const searchInputId = useId();
    const seasonSelectId = useId();
    const episodesInputId = useId();

    useEffect(() => {
        if (!startOpen) {
            setQuery("");
            setResults([]);
            setSelectedTv(null);
            setSeasons([]);
            setPlatform("");
            setRemoveFromWl(true);
        }
    }, [startOpen]);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2 || selectedTv) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `/api/tv/search?q=${encodeURIComponent(trimmed)}`
                );
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results || data.movies || []);
                }
            } catch {
                // ignora erro de rede temporário
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, selectedTv]);

    const handleSelectSeries = async (tv: Movie) => {
        setSelectedTv(tv);
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/tv/${tv.id}`);
            if (res.ok) {
                const data = await res.json();
                const detail: Movie = data.tv || data.movie || tv;
                setSelectedTv(detail);
                const validSeasons = (detail.seasons || []).filter(
                    (s) => s.season_number > 0 && s.episode_count > 0
                );
                setSeasons(validSeasons);
                const firstSeason = validSeasons[0];
                if (firstSeason) {
                    setSelectedSeasonNum(firstSeason.season_number);
                    setTotalEpisodes(firstSeason.episode_count);
                } else {
                    setSelectedSeasonNum(1);
                    setTotalEpisodes(detail.numberOfEpisodes || 8);
                }
                setRuntimePerEpisode(
                    detail.runtimePerEpisode || detail.runtime || 45
                );
            }
        } catch {
            // fallback para dados básicos
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSeasonChange = (seasonNum: number) => {
        setSelectedSeasonNum(seasonNum);
        const found = seasons.find((s) => s.season_number === seasonNum);
        if (found && found.episode_count > 0) {
            setTotalEpisodes(found.episode_count);
        }
    };

    const handleStartSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTv || starting) return;

        setStarting(true);
        try {
            const chosenSeason = seasons.find(
                (s) => s.season_number === selectedSeasonNum
            );
            const seasonName =
                chosenSeason?.name || `${selectedSeasonNum}ª Temporada`;
            const seasonPoster =
                chosenSeason?.poster_path || selectedTv.poster_path;

            await startSeriesProgress({
                tmdbId: selectedTv.id,
                title: selectedTv.title || selectedTv.name || "Série",
                posterPath: seasonPoster,
                backdropPath: selectedTv.backdrop_path ?? null,
                genres: selectedTv.genres || [],
                overview: chosenSeason?.overview || selectedTv.overview || null,
                firstAirDate:
                    selectedTv.first_air_date || selectedTv.release_date || null,
                seasonNumber: selectedSeasonNum,
                seasonName,
                totalEpisodes: Math.max(1, totalEpisodes),
                currentEpisode: 0,
                runtimePerEpisode: Math.max(1, runtimePerEpisode),
                platform: platform.trim() || null,
                removeFromWatchlist: removeFromWl
            });
            setStartOpen(false);
        } finally {
            setStarting(false);
        }
    };

    const isSelectedInWatchlist = Boolean(
        selectedTv && watchlist.some((w) => w.id === selectedTv.id)
    );

    return (
        <section aria-label="Assistindo no momento" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                        <Tv size={18} />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Assistindo no momento
                            </h2>
                            {seriesProgress.length > 0 && (
                                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    {seriesProgress.length}{" "}
                                    {seriesProgress.length === 1 ? "ativa" : "ativas"}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Acompanhem as temporadas em andamento e registrem os episódios vistos hoje
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setStartOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                >
                    <Plus size={15} />
                    Iniciar série
                </button>
            </div>

            {seriesProgress.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {seriesProgress.map((item) => (
                        <InProgressCard
                            key={item.id}
                            series={item}
                            onOpenCheckIn={(s) => setCheckInTarget(s)}
                            onOpenComplete={(s) => setCompleteTarget(s)}
                            onOpenAbandon={(s) => setAbandonTarget(s)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-200 bg-white/60 px-5 py-4 sm:flex-row dark:border-gray-800 dark:bg-card-dark/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Nenhuma série em andamento no momento. Comecem uma maratona para usar o check-in rápido no Calendário!
                    </p>
                    <button
                        type="button"
                        onClick={() => setStartOpen(true)}
                        className="shrink-0 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        + Adicionar série em andamento
                    </button>
                </div>
            )}

            {/* Modal Check-in "Assistimos hoje" */}
            <CheckInModal
                open={Boolean(checkInTarget)}
                onClose={() => setCheckInTarget(null)}
                series={checkInTarget}
                onRequestComplete={(s) => setCompleteTarget(s)}
            />

            {/* Modal Concluir Temporada */}
            <CompleteSeriesModal
                open={Boolean(completeTarget)}
                onClose={() => setCompleteTarget(null)}
                series={completeTarget}
            />

            {/* Modal Abandonar Série */}
            <AbandonSeriesModal
                open={Boolean(abandonTarget)}
                onClose={() => setAbandonTarget(null)}
                series={abandonTarget}
            />

            {/* Modal Iniciar Série em Andamento */}
            <Modal open={startOpen} onClose={() => setStartOpen(false)}>
                <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Iniciar série em andamento
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Busque a série no TMDB e escolha a temporada que estão começando.
                    </p>

                    {!selectedTv ? (
                        <div className="mt-4 space-y-3">
                            <div>
                                <label htmlFor={searchInputId} className="sr-only">
                                    Buscar série
                                </label>
                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                        id={searchInputId}
                                        type="search"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Ex: Severance, Dark, The Last of Us..."
                                        autoComplete="off"
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                    {searching && (
                                        <Loader2
                                            size={16}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-500"
                                        />
                                    )}
                                </div>
                            </div>

                            {results.length > 0 && (
                                <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
                                    {results.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectSeries(item)}
                                                className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                                    {item.poster_path ? (
                                                        <Image
                                                            src={getPosterUrl(
                                                                item.poster_path,
                                                                "w342"
                                                            )}
                                                            alt={item.title}
                                                            fill
                                                            sizes="40px"
                                                            className="object-cover"
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                        {item.title || item.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {(
                                                            item.first_air_date ||
                                                            item.release_date ||
                                                            ""
                                                        ).slice(0, 4)}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleStartSubmit} className="mt-4 space-y-4">
                            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                                        {selectedTv.poster_path && (
                                            <Image
                                                src={getPosterUrl(
                                                    selectedTv.poster_path,
                                                    "w342"
                                                )}
                                                alt={selectedTv.title}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {selectedTv.title || selectedTv.name}
                                        </p>
                                        {loadingDetails && (
                                            <p className="text-xs text-indigo-500">
                                                Carregando temporadas...
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTv(null)}
                                    className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                >
                                    Trocar
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor={seasonSelectId}
                                        className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                                    >
                                        Temporada
                                    </label>
                                    {seasons.length > 0 ? (
                                        <select
                                            id={seasonSelectId}
                                            value={selectedSeasonNum}
                                            onChange={(e) =>
                                                handleSeasonChange(Number(e.target.value))
                                            }
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        >
                                            {seasons.map((s) => (
                                                <option
                                                    key={s.season_number}
                                                    value={s.season_number}
                                                >
                                                    {s.name} ({s.episode_count} eps)
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            id={seasonSelectId}
                                            type="number"
                                            min={1}
                                            value={selectedSeasonNum}
                                            onChange={(e) =>
                                                setSelectedSeasonNum(Number(e.target.value))
                                            }
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor={episodesInputId}
                                        className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300"
                                    >
                                        Total de episódios
                                    </label>
                                    <input
                                        id={episodesInputId}
                                        type="number"
                                        min={1}
                                        max={500}
                                        value={totalEpisodes}
                                        onChange={(e) =>
                                            setTotalEpisodes(Number(e.target.value))
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Onde estão assistindo? (opcional)
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {PLATFORM_OPTIONS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() =>
                                                setPlatform(platform === p ? "" : p)
                                            }
                                            className={cn(
                                                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                                                platform === p
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isSelectedInWatchlist && (
                                <div className="flex items-center gap-2 rounded-xl bg-indigo-50/70 px-3.5 py-2.5 dark:bg-indigo-500/10">
                                    <input
                                        id="remove-wl-on-start"
                                        type="checkbox"
                                        checked={removeFromWl}
                                        onChange={(e) =>
                                            setRemoveFromWl(e.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label
                                        htmlFor="remove-wl-on-start"
                                        className="text-xs font-medium text-gray-700 dark:text-gray-200"
                                    >
                                        Remover da Lista de Interesse ao iniciar
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStartOpen(false)}
                                    className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={starting || loadingDetails}
                                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                                >
                                    {starting ? "Iniciando..." : "Começar a assistir"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>
        </section>
    );
}
