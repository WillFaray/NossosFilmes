"use server";

import { prisma } from "./db";
import { revalidatePath } from "next/cache";
import type {
    MediaType,
    DbUser,
    DbMovieReview,
    DbWatchlistItem,
    DbSeriesCheckin,
    DbSeriesProgress,
    DbSeriesProgressWithCheckins,
    AddSeriesProgressInput,
    AddSeriesCheckinInput,
    AbandonSeriesInput,
    CompleteSeriesInput,
    MovieReviewInput
} from "@/types";

export type {
    MediaType,
    DbUser,
    DbMovieReview,
    DbWatchlistItem,
    DbSeriesCheckin,
    DbSeriesProgress,
    DbSeriesProgressWithCheckins,
    AddSeriesProgressInput,
    AddSeriesCheckinInput,
    AbandonSeriesInput,
    CompleteSeriesInput,
    MovieReviewInput
};

/* ------------------------------------------------------------------ */
/* Validações                                                          */
/* ------------------------------------------------------------------ */

const RATING_MIN = 0.5;
const RATING_MAX = 5;
const TEXT_REVIEW_MAX = 280;
const NAME_MAX = 100;
const TITLE_MAX = 500;
const URL_MAX = 2048;
const GENRE_MAX = 20;
const GENRE_LENGTH_MAX = 100;
const MAX_REVIEWS = 10_000;
const MAX_WATCHLIST = 1_000;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/** Aceita apenas datas no formato YYYY-MM-DD que representem uma data real */
function isValidDateString(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function isValidHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function validateGenres(genres: unknown): string[] {
    assert(Array.isArray(genres), "Gêneros inválidos.");
    assert(genres.length <= GENRE_MAX, `Máximo de ${GENRE_MAX} gêneros.`);
    return genres.map((genre) => {
        assert(isNonEmptyString(genre), "Gênero inválido.");
        assert(genre.length <= GENRE_LENGTH_MAX, `Gênero excede ${GENRE_LENGTH_MAX} caracteres.`);
        return genre.trim();
    });
}

/**
 * Valida os dados de um registro de review.
 * Notas entre 0,5 e 5; data válida (YYYY-MM-DD); texto de 1 a 280 caracteres.
 */
function validateReviewInput(input: MovieReviewInput): void {
    assert(isNonEmptyString(input.tmdbId), "ID da obra inválido.");
    assert(input.tmdbId.length <= 32, "ID da obra excede o limite de caracteres.");
    assert(isNonEmptyString(input.title), "Título da obra inválido.");
    assert(input.title.length <= TITLE_MAX, `Título excede ${TITLE_MAX} caracteres.`);
    assert(
        typeof input.posterPath === "string" && input.posterPath.length <= URL_MAX,
        `Caminho do pôster excede ${URL_MAX} caracteres.`
    );
    assert(isValidDateString(input.dateWatched), "Data assistida inválida (use AAAA-MM-DD).");

    for (const rating of [input.ratingUser1, input.ratingUser2]) {
        assert(
            typeof rating === "number" && Number.isFinite(rating),
            "Nota inválida."
        );
        assert(
            rating >= RATING_MIN && rating <= RATING_MAX,
            `As notas devem estar entre ${RATING_MIN} e ${RATING_MAX}.`
        );
    }

    assert(isNonEmptyString(input.textReview), "Escreva uma avaliação curta.");
    assert(
        input.textReview.trim().length <= TEXT_REVIEW_MAX,
        `A avaliação deve ter no máximo ${TEXT_REVIEW_MAX} caracteres.`
    );

    validateGenres(input.genres);

    if (input.platform !== undefined && input.platform !== null) {
        assert(typeof input.platform === "string", "Plataforma inválida.");
        assert(input.platform.length <= 100, "Nome da plataforma/local excede 100 caracteres.");
    }

    assert(isNonEmptyString(input.recommendedById), "Indicador inválido.");
}

/** Garante que o indicador informado existe entre os usuários cadastrados */
async function assertRecommenderExists(recommendedById: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: recommendedById } });
    assert(user, "O usuário indicador não foi encontrado.");
}

function serializeReview(review: {
    id: string;
    tmdbId: string;
    title: string;
    posterPath: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    genres: string;
    recommendedById: string;
    platform?: string | null;
    runtime?: number | null;
    releaseDate?: string | null;
    overview?: string | null;
    mediaType?: string | null;
    seasonNumber?: number | null;
    seasonName?: string | null;
    totalEpisodes?: number | null;
    episodesWatched?: number | null;
    runtimePerEpisode?: number | null;
    watchedDates?: string | null;
    status?: string | null;
    abandonedReason?: string | null;
    seriesProgressId?: string | null;
}): DbMovieReview {
    return {
        ...review,
        genres: JSON.parse(review.genres || "[]") as string[],
        platform: review.platform ?? null,
        runtime: review.runtime ?? null,
        releaseDate: review.releaseDate ?? null,
        overview: review.overview ?? null,
        mediaType: (review.mediaType as MediaType) || "movie",
        seasonNumber: review.seasonNumber ?? null,
        seasonName: review.seasonName ?? null,
        totalEpisodes: review.totalEpisodes ?? null,
        episodesWatched: review.episodesWatched ?? null,
        runtimePerEpisode: review.runtimePerEpisode ?? null,
        watchedDates: review.watchedDates ?? null,
        status: review.status ?? "completed",
        abandonedReason: review.abandonedReason ?? null,
        seriesProgressId: review.seriesProgressId ?? null
    };
}

/* ------------------------------------------------------------------ */
/* Usuários                                                           */
/* ------------------------------------------------------------------ */

/** Busca todos os usuários */
export async function getUsers(): Promise<DbUser[]> {
    const users = await prisma.user.findMany({
        orderBy: { name: "asc" }
    });
    return users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl
    }));
}

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=4338ca&color=fff&size=150&bold=true";

/** Cria os dois perfis iniciais (onboarding) */
export async function setupUsers(input: {
    user1Name: string;
    user1Avatar?: string;
    user2Name: string;
    user2Avatar?: string;
}): Promise<DbUser[]> {
    const count = await prisma.user.count();
    if (count > 0) {
        throw new Error("Setup não permitido: usuários já existem.");
    }

    const users = await prisma.$transaction([
        prisma.user.create({
            data: {
                name: input.user1Name.trim(),
                avatarUrl: input.user1Avatar?.trim() || DEFAULT_AVATAR
            }
        }),
        prisma.user.create({
            data: {
                name: input.user2Name.trim(),
                avatarUrl: input.user2Avatar?.trim() || DEFAULT_AVATAR
            }
        })
    ]);

    revalidatePath("/");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl
    }));
}

/** Atualiza nome/foto de um usuário */
export async function updateUser(input: {
    id: string;
    name: string;
    avatarUrl?: string;
}): Promise<DbUser> {
    const user = await prisma.user.update({
        where: { id: input.id },
        data: {
            name: input.name.trim(),
            avatarUrl: input.avatarUrl?.trim() || DEFAULT_AVATAR
        }
    });

    revalidatePath("/");
    revalidatePath("/perfis");
    revalidatePath(`/perfis/${input.id}`);

    return {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl
    };
}

/* ------------------------------------------------------------------ */
/* Lista de Interesse (Watchlist)                                     */
/* ------------------------------------------------------------------ */

/** Busca todos os itens da watchlist */
export async function getWatchlist(): Promise<DbWatchlistItem[]> {
    const items = await prisma.watchlistItem.findMany({
        orderBy: { createdAt: "desc" }
    });

    return items.map((item) => ({
        ...item,
        genres: JSON.parse(item.genres || "[]") as string[],
        mediaType: (item.mediaType as MediaType) || "movie"
    }));
}

/** Adiciona um item (filme ou série) à watchlist */
export async function addToWatchlist(input: {
    tmdbId: string;
    title: string;
    posterPath?: string;
    genres?: string[];
    runtime?: number;
    releaseDate?: string;
    overview?: string;
    addedById?: string;
    mediaType?: "movie" | "tv";
    numberOfSeasons?: number;
    numberOfEpisodes?: number;
}): Promise<DbWatchlistItem> {
    let targetUserId = input.addedById?.trim();
    if (targetUserId) {
        const userExists = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
        if (!userExists) targetUserId = undefined;
    }

    if (!targetUserId) {
        const firstUser = await prisma.user.findFirst({ select: { id: true } });
        if (!firstUser) {
            throw new Error("Nenhum usuário cadastrado.");
        }
        targetUserId = firstUser.id;
    }

    assert(isNonEmptyString(input.tmdbId), "ID da obra inválido.");
    assert(isNonEmptyString(input.title), "Título da obra inválido.");

    const existing = await prisma.watchlistItem.findUnique({
        where: { tmdbId: input.tmdbId },
        select: { id: true }
    });
    assert(!existing, "Esta obra já está na lista de interesse.");

    const safePosterPath = typeof input.posterPath === "string" ? input.posterPath : "";
    const safeGenres = Array.isArray(input.genres) ? validateGenres(input.genres) : [];

    const item = await prisma.watchlistItem.create({
        data: {
            tmdbId: input.tmdbId,
            title: input.title,
            posterPath: safePosterPath,
            genres: JSON.stringify(safeGenres),
            runtime: input.runtime && input.runtime > 0 ? input.runtime : null,
            releaseDate: input.releaseDate || null,
            overview: input.overview || null,
            addedById: targetUserId,
            mediaType: input.mediaType || "movie",
            numberOfSeasons: input.numberOfSeasons ?? null,
            numberOfEpisodes: input.numberOfEpisodes ?? null
        }
    });

    revalidatePath("/lista-de-interesse");
    revalidatePath("/");

    return {
        ...item,
        genres: JSON.parse(item.genres || "[]") as string[],
        mediaType: (item.mediaType as MediaType) || "movie"
    };
}

/** Remove um item da watchlist (pelo tmdbId) */
export async function removeFromWatchlist(tmdbId: string): Promise<void> {
    await prisma.watchlistItem.deleteMany({
        where: { tmdbId }
    });

    revalidatePath("/lista-de-interesse");
    revalidatePath("/");
}

/* ------------------------------------------------------------------ */
/* Avaliações (Reviews)                                               */
/* ------------------------------------------------------------------ */

/** Busca todas as reviews, incluindo o indicador */
export async function getReviews(): Promise<(DbMovieReview & { recommender: DbUser })[]> {
    const reviews = await prisma.movieReview.findMany({
        include: { recommendedBy: true },
        orderBy: { dateWatched: "desc" }
    });

    return reviews.map((r) => ({
        ...serializeReview(r),
        recommender: {
            id: r.recommendedBy.id,
            name: r.recommendedBy.name,
            avatarUrl: r.recommendedBy.avatarUrl
        }
    }));
}

/**
 * Adiciona um novo registro de filme ou temporada assistida.
 * Permite múltiplas sessões da mesma obra: cada chamada cria um novo registro.
 * A criação e a remoção da watchlist acontecem na mesma transação.
 */
export async function addMovieReview(input: MovieReviewInput): Promise<DbMovieReview> {
    validateReviewInput(input);
    await assertRecommenderExists(input.recommendedById);

    const shouldRemoveWatchlist = input.removeFromWatchlist !== false;

    const review = await prisma.$transaction(async (tx) => {
        if (shouldRemoveWatchlist) {
            await tx.watchlistItem.deleteMany({
                where: { tmdbId: input.tmdbId }
            });
        }

        if (input.seriesProgressId) {
            await tx.seriesProgress.updateMany({
                where: { id: input.seriesProgressId },
                data: {
                    status: input.status === "abandoned" ? "abandoned" : "completed",
                    ...(typeof input.episodesWatched === "number"
                        ? { currentEpisode: input.episodesWatched }
                        : {}),
                    updatedAt: new Date()
                }
            });
        }

        const resolvedRuntime =
            input.runtime && input.runtime > 0
                ? input.runtime
                : input.mediaType === "tv" &&
                  (input.episodesWatched || input.totalEpisodes) &&
                  (input.runtimePerEpisode || 45)
                ? Math.max(1, input.episodesWatched ?? input.totalEpisodes ?? 1) *
                  (input.runtimePerEpisode && input.runtimePerEpisode > 0
                      ? input.runtimePerEpisode
                      : 45)
                : null;

        return tx.movieReview.create({
            data: {
                tmdbId: input.tmdbId,
                title: input.title,
                posterPath: input.posterPath,
                dateWatched: input.dateWatched,
                ratingUser1: input.ratingUser1,
                ratingUser2: input.ratingUser2,
                textReview: input.textReview.trim(),
                genres: JSON.stringify(input.genres),
                platform: input.platform?.trim() || null,
                runtime: resolvedRuntime,
                releaseDate: input.releaseDate || null,
                overview: input.overview || null,
                recommendedById: input.recommendedById,
                mediaType: input.mediaType || "movie",
                seasonNumber: input.seasonNumber ?? null,
                seasonName: input.seasonName?.trim() || null,
                totalEpisodes: input.totalEpisodes ?? null,
                episodesWatched: input.episodesWatched ?? null,
                runtimePerEpisode: input.runtimePerEpisode ?? null,
                watchedDates: Array.isArray(input.watchedDates)
                    ? JSON.stringify([...input.watchedDates].sort())
                    : (input.watchedDates || null),
                status: input.status || "completed",
                abandonedReason: input.abandonedReason?.trim() || null,
                seriesProgressId: input.seriesProgressId || null
            }
        });
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return serializeReview(review);
}

/** Atualiza um registro de filme ou temporada assistida */
export async function updateMovieReview(
    id: string,
    input: MovieReviewInput
): Promise<DbMovieReview> {
    validateReviewInput(input);
    await assertRecommenderExists(input.recommendedById);

    const resolvedRuntime =
        input.runtime && input.runtime > 0
            ? input.runtime
            : input.mediaType === "tv" &&
              (input.episodesWatched || input.totalEpisodes) &&
              (input.runtimePerEpisode || 45)
            ? Math.max(1, input.episodesWatched ?? input.totalEpisodes ?? 1) *
              (input.runtimePerEpisode && input.runtimePerEpisode > 0
                  ? input.runtimePerEpisode
                  : 45)
            : null;

    const review = await prisma.movieReview.update({
        where: { id },
        data: {
            tmdbId: input.tmdbId,
            title: input.title,
            posterPath: input.posterPath,
            dateWatched: input.dateWatched,
            ratingUser1: input.ratingUser1,
            ratingUser2: input.ratingUser2,
            textReview: input.textReview.trim(),
            genres: JSON.stringify(input.genres),
            platform: input.platform?.trim() || null,
            runtime: resolvedRuntime,
            releaseDate: input.releaseDate || null,
            overview: input.overview || null,
            recommendedById: input.recommendedById,
            mediaType: input.mediaType || "movie",
            seasonNumber: input.seasonNumber ?? null,
            seasonName: input.seasonName?.trim() || null,
            totalEpisodes: input.totalEpisodes ?? null,
            episodesWatched: input.episodesWatched ?? null,
            runtimePerEpisode: input.runtimePerEpisode ?? null,
            watchedDates: Array.isArray(input.watchedDates)
                ? JSON.stringify([...input.watchedDates].sort())
                : (input.watchedDates || null),
            status: input.status || "completed",
            abandonedReason: input.abandonedReason?.trim() || null,
            seriesProgressId: input.seriesProgressId || null
        }
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return serializeReview(review);
}

/** Remove um registro de avaliação */
export async function deleteMovieReview(id: string): Promise<void> {
    await prisma.movieReview.delete({
        where: { id }
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");
}

/* ------------------------------------------------------------------ */
/* Séries em Andamento (SeriesProgress & SeriesCheckin)               */
/* ------------------------------------------------------------------ */

/** Busca todas as séries em andamento no topo da Home com seus check-ins */
export async function getSeriesProgressList(): Promise<DbSeriesProgressWithCheckins[]> {
    const list = await prisma.seriesProgress.findMany({
        where: { status: "watching" },
        include: {
            checkins: {
                orderBy: { dateWatched: "desc" }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    return list.map((item) => ({
        ...item,
        genres: JSON.parse(item.genres || "[]") as string[],
        checkins: item.checkins.map((c) => ({
            id: c.id,
            seriesProgressId: c.seriesProgressId,
            dateWatched: c.dateWatched,
            episodeStart: c.episodeStart,
            episodeEnd: c.episodeEnd,
            episodeTag: c.episodeTag,
            createdAt: c.createdAt
        }))
    }));
}

/** Busca todos os registros de SeriesProgress (incluindo concluídos/abandonados) com seus check-ins para o Calendário */
export async function getAllSeriesProgress(): Promise<DbSeriesProgressWithCheckins[]> {
    const list = await prisma.seriesProgress.findMany({
        include: {
            checkins: {
                orderBy: { dateWatched: "desc" }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    return list.map((item) => ({
        ...item,
        genres: JSON.parse(item.genres || "[]") as string[],
        checkins: item.checkins.map((c) => ({
            id: c.id,
            seriesProgressId: c.seriesProgressId,
            dateWatched: c.dateWatched,
            episodeStart: c.episodeStart,
            episodeEnd: c.episodeEnd,
            episodeTag: c.episodeTag,
            createdAt: c.createdAt
        }))
    }));
}

/** Adiciona uma série ao bloco 'Assistindo no momento' */
export async function addSeriesProgress(input: AddSeriesProgressInput): Promise<DbSeriesProgress> {
    assert(isNonEmptyString(input.tmdbId), "ID da série inválido.");
    assert(isNonEmptyString(input.title), "Título da série inválido.");
    const poster = typeof input.posterPath === "string" ? input.posterPath : "";
    assert(poster.length <= URL_MAX, `Caminho do pôster excede ${URL_MAX} caracteres.`);
    const genres = input.genres ? validateGenres(input.genres) : [];

    const seasonNum = typeof input.seasonNumber === "number" && input.seasonNumber > 0 ? input.seasonNumber : 1;
    const seasonNm = input.seasonName?.trim() || `${seasonNum}ª Temporada`;
    const totalEps = typeof input.totalEpisodes === "number" && input.totalEpisodes > 0 ? input.totalEpisodes : 1;
    const currentEp = typeof input.currentEpisode === "number" && input.currentEpisode >= 0 ? input.currentEpisode : 0;
    const runtime = typeof input.runtimePerEpisode === "number" && input.runtimePerEpisode > 0 ? input.runtimePerEpisode : 45;

    const shouldRemoveWatchlist = input.removeFromWatchlist !== false;

    const progress = await prisma.$transaction(async (tx) => {
        if (shouldRemoveWatchlist) {
            await tx.watchlistItem.deleteMany({
                where: { tmdbId: input.tmdbId }
            });
        }

        return tx.seriesProgress.create({
            data: {
                tmdbId: input.tmdbId,
                title: input.title.trim(),
                posterPath: poster,
                backdropPath: input.backdropPath?.trim() || null,
                genres: JSON.stringify(genres),
                overview: input.overview?.trim() || null,
                firstAirDate: input.firstAirDate?.trim() || null,
                seasonNumber: seasonNum,
                seasonName: seasonNm,
                totalEpisodes: totalEps,
                currentEpisode: currentEp,
                runtimePerEpisode: runtime,
                platform: input.platform?.trim() || null,
                status: "watching"
            }
        });
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");

    return {
        ...progress,
        genres: JSON.parse(progress.genres || "[]") as string[]
    };
}

/** Registra uma sessão diária de episódios vistos ('Assistimos hoje') */
export async function addSeriesCheckin(input: AddSeriesCheckinInput): Promise<DbSeriesCheckin> {
    assert(isNonEmptyString(input.seriesProgressId), "ID de progresso da série inválido.");
    assert(isValidDateString(input.dateWatched), "Data do check-in inválida (use AAAA-MM-DD).");
    assert(
        typeof input.episodeStart === "number" && input.episodeStart >= 1,
        "Episódio inicial inválido."
    );
    assert(
        typeof input.episodeEnd === "number" && input.episodeEnd >= input.episodeStart,
        "Episódio final deve ser maior ou igual ao inicial."
    );

    const progress = await prisma.seriesProgress.findUnique({
        where: { id: input.seriesProgressId }
    });
    assert(progress, "Série em andamento não encontrada.");
    assert(
        input.episodeEnd <= progress.totalEpisodes,
        "O episódio final excede o total de episódios da temporada."
    );

    const seasonCode = `S${String(progress.seasonNumber).padStart(2, "0")}`;
    const generatedTag =
        input.episodeStart === input.episodeEnd
            ? `${seasonCode} • Ep ${input.episodeStart}`
            : `${seasonCode} • Eps ${input.episodeStart}-${input.episodeEnd}`;

    const episodeTag = input.episodeTag?.trim() || generatedTag;

    const checkin = await prisma.$transaction(async (tx) => {
        const newCheckin = await tx.seriesCheckin.create({
            data: {
                seriesProgressId: input.seriesProgressId,
                dateWatched: input.dateWatched,
                episodeStart: input.episodeStart,
                episodeEnd: input.episodeEnd,
                episodeTag
            }
        });

        const updatedCurrent = Math.max(progress.currentEpisode, input.episodeEnd);
        await tx.seriesProgress.update({
            where: { id: input.seriesProgressId },
            data: {
                currentEpisode: updatedCurrent,
                updatedAt: new Date()
            }
        });

        return newCheckin;
    });

    revalidatePath("/");
    revalidatePath("/perfis");

    return {
        id: checkin.id,
        seriesProgressId: checkin.seriesProgressId,
        dateWatched: checkin.dateWatched,
        episodeStart: checkin.episodeStart,
        episodeEnd: checkin.episodeEnd,
        episodeTag: checkin.episodeTag,
        createdAt: checkin.createdAt
    };
}

/** Cancela e exclui silenciosamente uma série em andamento sem poluir o histórico */
export async function deleteSeriesProgress(id: string): Promise<{ success: boolean }> {
    assert(isNonEmptyString(id), "ID da série inválido.");

    await prisma.seriesProgress.delete({
        where: { id }
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");

    return { success: true };
}

/** Marca uma série em andamento como abandonada com avaliação leve */
export async function abandonSeriesProgress(
    id: string,
    input: AbandonSeriesInput
): Promise<DbMovieReview> {
    assert(isNonEmptyString(id), "ID da série inválido.");
    assert(isNonEmptyString(input.abandonedReason), "Motivo do abandono é obrigatório.");

    const progress = await prisma.seriesProgress.findUnique({
        where: { id },
        include: { checkins: { orderBy: { dateWatched: "asc" } } }
    });
    assert(progress, "Série em andamento não encontrada.");

    let recommenderId = input.recommendedById?.trim();
    if (recommenderId) {
        await assertRecommenderExists(recommenderId);
    } else {
        const firstUser = await prisma.user.findFirst({ select: { id: true } });
        assert(firstUser, "Nenhum usuário cadastrado.");
        recommenderId = firstUser.id;
    }

    const checkinDates = progress.checkins.map((c) => c.dateWatched);
    const watchedDates =
        checkinDates.length > 0
            ? Array.from(new Set(checkinDates)).sort()
            : [input.dateWatched || new Date().toISOString().slice(0, 10)];
    const latestDate = watchedDates[watchedDates.length - 1];

    const episodesWatched =
        typeof input.episodesWatched === "number" && input.episodesWatched >= 0
            ? input.episodesWatched
            : progress.currentEpisode;

    const runtimePerEpisode = progress.runtimePerEpisode || 45;
    const totalRuntime = episodesWatched * runtimePerEpisode;

    const ratingUser1 =
        typeof input.ratingUser1 === "number" && Number.isFinite(input.ratingUser1)
            ? Math.max(RATING_MIN, Math.min(RATING_MAX, input.ratingUser1))
            : 2.5;
    const ratingUser2 =
        typeof input.ratingUser2 === "number" && Number.isFinite(input.ratingUser2)
            ? Math.max(RATING_MIN, Math.min(RATING_MAX, input.ratingUser2))
            : 2.5;

    const reviewText =
        input.textReview?.trim() || `Série abandonada: ${input.abandonedReason.trim()}`;

    const review = await prisma.$transaction(async (tx) => {
        await tx.seriesProgress.update({
            where: { id },
            data: {
                status: "abandoned",
                currentEpisode: episodesWatched,
                updatedAt: new Date()
            }
        });

        return tx.movieReview.create({
            data: {
                tmdbId: progress.tmdbId,
                title: progress.title,
                posterPath: progress.posterPath,
                dateWatched: latestDate,
                ratingUser1,
                ratingUser2,
                textReview: reviewText,
                genres: progress.genres,
                platform: input.platform?.trim() || progress.platform,
                runtime: totalRuntime > 0 ? totalRuntime : null,
                releaseDate: progress.firstAirDate,
                overview: progress.overview,
                recommendedById: recommenderId,
                mediaType: "tv",
                seasonNumber: progress.seasonNumber,
                seasonName: progress.seasonName,
                totalEpisodes: input.totalEpisodes ?? progress.totalEpisodes,
                episodesWatched,
                runtimePerEpisode,
                watchedDates: JSON.stringify(watchedDates),
                status: "abandoned",
                abandonedReason: input.abandonedReason.trim(),
                seriesProgressId: progress.id
            }
        });
    });

    revalidatePath("/");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return serializeReview(review);
}

/** Conclui uma temporada/série em andamento e cria a avaliação final no Diário */
export async function completeSeriesProgress(
    id: string,
    input: CompleteSeriesInput
): Promise<DbMovieReview> {
    assert(isNonEmptyString(id), "ID da série inválido.");

    const progress = await prisma.seriesProgress.findUnique({
        where: { id },
        include: { checkins: { orderBy: { dateWatched: "asc" } } }
    });
    assert(progress, "Série em andamento não encontrada.");

    let recommenderId = input.recommendedById?.trim();
    if (recommenderId) {
        await assertRecommenderExists(recommenderId);
    } else {
        const firstUser = await prisma.user.findFirst({ select: { id: true } });
        assert(firstUser, "Nenhum usuário cadastrado.");
        recommenderId = firstUser.id;
    }

    for (const rating of [input.ratingUser1, input.ratingUser2]) {
        assert(
            typeof rating === "number" && Number.isFinite(rating),
            "Nota inválida."
        );
        assert(
            rating >= RATING_MIN && rating <= RATING_MAX,
            `As notas devem estar entre ${RATING_MIN} e ${RATING_MAX}.`
        );
    }

    assert(isNonEmptyString(input.textReview), "Escreva uma avaliação curta.");
    assert(
        input.textReview.trim().length <= TEXT_REVIEW_MAX,
        `A avaliação deve ter no máximo ${TEXT_REVIEW_MAX} caracteres.`
    );

    const checkinDates = progress.checkins.map((c) => c.dateWatched);
    const watchedDates =
        Array.isArray(input.watchedDates) && input.watchedDates.length > 0
            ? Array.from(new Set(input.watchedDates)).sort()
            : checkinDates.length > 0
            ? Array.from(new Set(checkinDates)).sort()
            : [input.dateWatched || new Date().toISOString().slice(0, 10)];

    const dateWatched = input.dateWatched || watchedDates[watchedDates.length - 1];
    assert(isValidDateString(dateWatched), "Data assistida inválida (use AAAA-MM-DD).");

    const totalEpisodes =
        typeof input.totalEpisodes === "number" && input.totalEpisodes > 0
            ? input.totalEpisodes
            : progress.totalEpisodes;
    const episodesWatched =
        typeof input.episodesWatched === "number" && input.episodesWatched > 0
            ? input.episodesWatched
            : totalEpisodes;
    const runtimePerEpisode =
        typeof input.runtimePerEpisode === "number" && input.runtimePerEpisode > 0
            ? input.runtimePerEpisode
            : progress.runtimePerEpisode || 45;
    const totalRuntime = episodesWatched * runtimePerEpisode;
    const shouldRemoveWatchlist = input.removeFromWatchlist === true;

    const review = await prisma.$transaction(async (tx) => {
        if (shouldRemoveWatchlist) {
            await tx.watchlistItem.deleteMany({
                where: { tmdbId: progress.tmdbId }
            });
        }

        await tx.seriesProgress.update({
            where: { id },
            data: {
                status: "completed",
                currentEpisode: episodesWatched,
                updatedAt: new Date()
            }
        });

        return tx.movieReview.create({
            data: {
                tmdbId: progress.tmdbId,
                title: progress.title,
                posterPath: progress.posterPath,
                dateWatched,
                ratingUser1: input.ratingUser1,
                ratingUser2: input.ratingUser2,
                textReview: input.textReview.trim(),
                genres: progress.genres,
                platform: input.platform?.trim() || progress.platform,
                runtime: totalRuntime > 0 ? totalRuntime : null,
                releaseDate: progress.firstAirDate,
                overview: progress.overview,
                recommendedById: recommenderId,
                mediaType: "tv",
                seasonNumber: progress.seasonNumber,
                seasonName: progress.seasonName,
                totalEpisodes,
                episodesWatched,
                runtimePerEpisode,
                watchedDates: JSON.stringify(watchedDates),
                status: "completed",
                seriesProgressId: progress.id
            }
        });
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return serializeReview(review);
}

/* ------------------------------------------------------------------ */
/* Exportação / Importação / Backup                                    */
/* ------------------------------------------------------------------ */

export interface ExportData {
    version: number;
    exportedAt: string;
    users: DbUser[];
    reviews: DbMovieReview[];
    watchlist: DbWatchlistItem[];
    seriesProgress?: DbSeriesProgressWithCheckins[];
}

/** Exporta todos os dados da aplicação como JSON (versão 2 com seriesProgress) */
export async function exportData(): Promise<ExportData> {
    const [users, reviews, watchlist, seriesProgress] = await Promise.all([
        getUsers(),
        getReviews(),
        getWatchlist(),
        prisma.seriesProgress.findMany({
            include: {
                checkins: {
                    orderBy: { dateWatched: "asc" }
                }
            },
            orderBy: { createdAt: "desc" }
        })
    ]);

    const serializedSeriesProgress: DbSeriesProgressWithCheckins[] = seriesProgress.map((sp) => ({
        id: sp.id,
        tmdbId: sp.tmdbId,
        title: sp.title,
        posterPath: sp.posterPath,
        backdropPath: sp.backdropPath,
        genres: JSON.parse(sp.genres || "[]") as string[],
        overview: sp.overview,
        firstAirDate: sp.firstAirDate,
        seasonNumber: sp.seasonNumber,
        seasonName: sp.seasonName,
        totalEpisodes: sp.totalEpisodes,
        currentEpisode: sp.currentEpisode,
        runtimePerEpisode: sp.runtimePerEpisode,
        platform: sp.platform,
        status: sp.status,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
        checkins: sp.checkins.map((c) => ({
            id: c.id,
            seriesProgressId: c.seriesProgressId,
            dateWatched: c.dateWatched,
            episodeStart: c.episodeStart,
            episodeEnd: c.episodeEnd,
            episodeTag: c.episodeTag,
            createdAt: c.createdAt
        }))
    }));

    return {
        version: 2,
        exportedAt: new Date().toISOString(),
        users,
        reviews: reviews.map(({ recommender: _recommender, ...review }) => review),
        watchlist,
        seriesProgress: serializedSeriesProgress
    };
}

/**
 * Valida completamente um arquivo de importação:
 * estrutura, exatamente dois usuários, IDs únicos, notas (0,5–5), datas válidas,
 * textos (≤280), gêneros, URLs, usuários referenciados e limites de tamanho.
 * Suporta retrocompatibilidade 100% com backups versão 1 (sem seriesProgress).
 */
function validateImportData(raw: unknown): asserts raw is ExportData {
    assert(typeof raw === "object" && raw !== null, "Arquivo de importação com formato inválido.");
    const data = raw as Partial<ExportData>;

    assert(Array.isArray(data.users), "Formato inválido: lista de usuários ausente no arquivo.");
    assert(Array.isArray(data.reviews), "Formato inválido: lista de registros ausente no arquivo.");
    assert(Array.isArray(data.watchlist), "Formato inválido: lista de interesse ausente no arquivo.");

    // Exatamente dois usuários (a aplicação é para um casal)
    assert(data.users!.length === 2, "O arquivo deve conter exatamente dois usuários.");

    // Limites de tamanho
    assert(data.reviews!.length <= MAX_REVIEWS, `Máximo de ${MAX_REVIEWS} registros por arquivo.`);
    assert(data.watchlist!.length <= MAX_WATCHLIST, `Máximo de ${MAX_WATCHLIST} títulos na lista.`);

    // Usuários: IDs únicos, nome e URL válidos
    const userIds = new Set<string>();
    for (const user of data.users!) {
        assert(isNonEmptyString(user?.id), "Usuário com ID inválido.");
        assert(!userIds.has(user.id), `ID de usuário duplicado: "${user.id}".`);
        userIds.add(user.id);

        assert(isNonEmptyString(user.name), "Usuário com nome inválido.");
        assert(user.name.trim().length <= NAME_MAX, `Nome excede ${NAME_MAX} caracteres.`);

        assert(typeof user.avatarUrl === "string", "Usuário com URL de avatar inválida.");
        assert(
            user.avatarUrl === "" || (user.avatarUrl.length <= URL_MAX && isValidHttpUrl(user.avatarUrl)),
            `URL de avatar inválida para "${user.name}".`
        );
    }

    // Reviews: IDs únicos, campos válidos e indicador existente
    for (const review of data.reviews!) {
        assert(isNonEmptyString(review?.id), "Registro com ID inválido.");
        assert(isNonEmptyString(review.tmdbId), `Registro "${review.title ?? ""}" sem ID TMDB.`);
        assert(isNonEmptyString(review.title), "Registro com título inválido.");
        assert(review.title.length <= TITLE_MAX, `Título excede ${TITLE_MAX} caracteres.`);
        assert(
            typeof review.posterPath === "string" && review.posterPath.length <= URL_MAX,
            `Caminho do pôster excede ${URL_MAX} caracteres.`
        );
        assert(isValidDateString(review.dateWatched), `Data inválida em "${review.title}".`);

        for (const rating of [review.ratingUser1, review.ratingUser2]) {
            assert(
                typeof rating === "number" && Number.isFinite(rating) &&
                rating >= RATING_MIN && rating <= RATING_MAX,
                `Nota inválida em "${review.title}" (deve estar entre ${RATING_MIN} e ${RATING_MAX}).`
            );
        }

        assert(isNonEmptyString(review.textReview), `Avaliação vazia em "${review.title}".`);
        assert(
            review.textReview.length <= TEXT_REVIEW_MAX,
            `Avaliação excede ${TEXT_REVIEW_MAX} caracteres em "${review.title}".`
        );

        validateGenres(review.genres);

        if (review.platform !== undefined && review.platform !== null) {
            assert(typeof review.platform === "string", "Plataforma inválida.");
            assert(review.platform.length <= 100, "Plataforma excede 100 caracteres.");
        }

        assert(
            isNonEmptyString(review.recommendedById) && userIds.has(review.recommendedById),
            `Registro "${review.title}" referencia um usuário inexistente.`
        );
    }

    const reviewIds = new Set(data.reviews!.map((r) => r.id));
    assert(reviewIds.size === data.reviews!.length, "Existem registros com ID duplicado no arquivo.");

    // Watchlist: IDs e tmdbIds únicos
    const watchlistTmdbIds = new Set<string>();
    for (const item of data.watchlist!) {
        assert(isNonEmptyString(item?.id), "Item da lista com ID inválido.");
        assert(isNonEmptyString(item.tmdbId), "Item da lista sem ID TMDB.");
        assert(!watchlistTmdbIds.has(item.tmdbId), `Título duplicado na lista de interesse: "${item.title}".`);
        watchlistTmdbIds.add(item.tmdbId);

        assert(isNonEmptyString(item.title), "Item da lista com título inválido.");
        assert(item.title.length <= TITLE_MAX, `Título excede ${TITLE_MAX} caracteres.`);
        assert(
            typeof item.posterPath === "string" && item.posterPath.length <= URL_MAX,
            `Caminho do pôster excede ${URL_MAX} caracteres.`
        );
        validateGenres(item.genres);
    }

    // Validação retrocompatível: apenas FILMES não podem coexistir simultaneamente na watchlist.
    // Séries de TV podem permanecer na lista mesmo após assistir temporadas (R4).
    for (const review of data.reviews!) {
        const isTv = review.mediaType === "tv";
        if (!isTv && watchlistTmdbIds.has(review.tmdbId)) {
            const watchItem = data.watchlist!.find((w) => w.tmdbId === review.tmdbId);
            if (!watchItem || watchItem.mediaType !== "tv") {
                throw new Error(`O filme "${review.title}" não pode estar simultaneamente assistido e na lista de interesse.`);
            }
        }
    }

    // Validação opcional de seriesProgress (presente na v2, ausente na v1)
    if (data.seriesProgress !== undefined) {
        assert(Array.isArray(data.seriesProgress), "Campo seriesProgress deve ser uma lista.");
        const spIds = new Set<string>();
        for (const sp of data.seriesProgress) {
            assert(isNonEmptyString(sp.id), "Série em andamento com ID inválido.");
            assert(!spIds.has(sp.id), `ID duplicado em seriesProgress: "${sp.id}".`);
            spIds.add(sp.id);
            assert(isNonEmptyString(sp.tmdbId), "Série em andamento sem ID TMDB.");
            assert(isNonEmptyString(sp.title), "Série em andamento sem título.");
            validateGenres(sp.genres);

            if (sp.checkins) {
                assert(Array.isArray(sp.checkins), `Checkins inválidos na série "${sp.title}".`);
                for (const c of sp.checkins) {
                    assert(isValidDateString(c.dateWatched), `Data de checkin inválida em "${sp.title}".`);
                    assert(typeof c.episodeStart === "number" && c.episodeStart >= 1, "Episódio inicial inválido.");
                    assert(typeof c.episodeEnd === "number" && c.episodeEnd >= c.episodeStart, "Episódio final inválido.");
                }
            }
        }
    }
}

/**
 * Importa dados de um backup JSON, substituindo todo o conteúdo atual do banco.
 * A operação é atômica: ou tudo é importado, ou nada muda.
 */
export async function importData(
    raw: unknown
): Promise<{ users: number; reviews: number; watchlist: number; seriesProgress: number }> {
    let serialized: string;
    try {
        serialized = JSON.stringify(raw);
    } catch {
        throw new Error("Arquivo de importação inválido.");
    }
    assert(
        Buffer.byteLength(serialized, "utf8") <= MAX_IMPORT_BYTES,
        "Arquivo de importação excede o limite máximo de 10 MB."
    );

    validateImportData(raw);

    const firstUser = raw.users[0];
    const seriesList = Array.isArray(raw.seriesProgress) ? raw.seriesProgress : [];

    await prisma.$transaction([
        prisma.seriesCheckin.deleteMany(),
        prisma.seriesProgress.deleteMany(),
        prisma.movieReview.deleteMany(),
        prisma.watchlistItem.deleteMany(),
        prisma.user.deleteMany(),
        ...raw.users.map((user) =>
            prisma.user.create({
                data: {
                    id: user.id,
                    name: user.name.trim(),
                    avatarUrl: user.avatarUrl || DEFAULT_AVATAR
                }
            })
        ),
        ...raw.watchlist.map((item) =>
            prisma.watchlistItem.create({
                data: {
                    id: item.id,
                    tmdbId: item.tmdbId,
                    title: item.title,
                    posterPath: item.posterPath,
                    genres: JSON.stringify(item.genres ?? []),
                    runtime: typeof item.runtime === "number" && item.runtime > 0 ? item.runtime : null,
                    releaseDate: item.releaseDate || null,
                    overview: item.overview || null,
                    mediaType: item.mediaType || "movie",
                    numberOfSeasons: item.numberOfSeasons ?? null,
                    numberOfEpisodes: item.numberOfEpisodes ?? null,
                    addedById: item.addedById && raw.users.some((u) => u.id === item.addedById) ? item.addedById : firstUser.id
                }
            })
        ),
        ...raw.reviews.map((review) =>
            prisma.movieReview.create({
                data: {
                    id: review.id,
                    tmdbId: review.tmdbId,
                    title: review.title,
                    posterPath: review.posterPath,
                    dateWatched: review.dateWatched,
                    ratingUser1: review.ratingUser1,
                    ratingUser2: review.ratingUser2,
                    textReview: review.textReview,
                    genres: JSON.stringify(review.genres ?? []),
                    platform: review.platform?.trim() || null,
                    runtime: typeof review.runtime === "number" && review.runtime > 0 ? review.runtime : null,
                    releaseDate: review.releaseDate || null,
                    overview: review.overview || null,
                    recommendedById: review.recommendedById,
                    mediaType: review.mediaType || "movie",
                    seasonNumber: review.seasonNumber ?? null,
                    seasonName: review.seasonName ?? null,
                    totalEpisodes: review.totalEpisodes ?? null,
                    episodesWatched: review.episodesWatched ?? null,
                    runtimePerEpisode: review.runtimePerEpisode ?? null,
                    watchedDates: Array.isArray(review.watchedDates)
                        ? JSON.stringify([...review.watchedDates].sort())
                        : (review.watchedDates || null),
                    status: review.status || "completed",
                    abandonedReason: review.abandonedReason || null,
                    seriesProgressId: review.seriesProgressId || null
                }
            })
        ),
        ...seriesList.map((sp) =>
            prisma.seriesProgress.create({
                data: {
                    id: sp.id,
                    tmdbId: sp.tmdbId,
                    title: sp.title,
                    posterPath: sp.posterPath,
                    backdropPath: sp.backdropPath || null,
                    genres: JSON.stringify(sp.genres ?? []),
                    overview: sp.overview || null,
                    firstAirDate: sp.firstAirDate || null,
                    seasonNumber: sp.seasonNumber ?? 1,
                    seasonName: sp.seasonName || `${sp.seasonNumber ?? 1}ª Temporada`,
                    totalEpisodes: sp.totalEpisodes ?? 1,
                    currentEpisode: sp.currentEpisode ?? 0,
                    runtimePerEpisode: sp.runtimePerEpisode ?? 45,
                    platform: sp.platform || null,
                    status: sp.status || "watching",
                    checkins: sp.checkins && sp.checkins.length > 0 ? {
                        create: sp.checkins.map((c) => ({
                            id: c.id,
                            dateWatched: c.dateWatched,
                            episodeStart: c.episodeStart,
                            episodeEnd: c.episodeEnd,
                            episodeTag: c.episodeTag
                        }))
                    } : undefined
                }
            })
        )
    ]);

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/configuracoes");

    return {
        users: raw.users.length,
        reviews: raw.reviews.length,
        watchlist: raw.watchlist.length,
        seriesProgress: seriesList.length
    };
}

/**
 * Gera um backup físico do banco SQLite (via VACUUM INTO) e retorna
 * o conteúdo do arquivo em base64 para download no cliente.
 */
export async function backupDatabase(): Promise<string> {
    const os = await import("os");
    const fs = await import("fs/promises");
    const path = await import("path");

    const target = path.join(os.tmpdir(), `nossosmomentos-backup-${Date.now()}.db`);
    const safeTarget = target.replace(/'/g, "''");

    try {
        await prisma.$executeRawUnsafe(`VACUUM INTO '${safeTarget}'`);
        const buffer = await fs.readFile(target);
        return buffer.toString("base64");
    } finally {
        await fs.unlink(target).catch(() => undefined);
    }
}

/**
 * Mescla dados de um backup JSON com os dados existentes no banco.
 * Mantém os dados atuais e adiciona apenas obras e avaliações que ainda não existem.
 */
export async function mergeData(
    raw: unknown
): Promise<{ addedReviews: number; addedWatchlist: number; addedSeriesProgress: number }> {
    let serialized: string;
    try {
        serialized = JSON.stringify(raw);
    } catch {
        throw new Error("Arquivo de importação inválido.");
    }
    assert(
        Buffer.byteLength(serialized, "utf8") <= MAX_IMPORT_BYTES,
        "Arquivo de importação excede o limite máximo de 10 MB."
    );

    validateImportData(raw);

    const [currentUsers, currentReviews, currentWatchlist, currentProgress] = await Promise.all([
        prisma.user.findMany(),
        prisma.movieReview.findMany(),
        prisma.watchlistItem.findMany(),
        prisma.seriesProgress.findMany()
    ]);

    assert(
        currentUsers.length === 2,
        "A aplicação deve ter dois usuários configurados para mesclar dados."
    );

    const existingReviewKeys = new Set<string>();
    for (const r of currentReviews) {
        existingReviewKeys.add(`${r.tmdbId}_${r.dateWatched}`);
        if (r.mediaType === "tv") {
            existingReviewKeys.add(`${r.tmdbId}_s${r.seasonNumber ?? 0}_${r.dateWatched}`);
        }
    }
    const existingWatchlistTmdbIds = new Set(currentWatchlist.map((w) => w.tmdbId));
    const allWatchedMovieTmdbIds = new Set(
        currentReviews.filter((r) => r.mediaType !== "tv").map((r) => r.tmdbId)
    );

    const importUser1Id = raw.users[0]?.id;
    const defaultRecommenderId = currentUsers[0].id;
    const secondRecommenderId = currentUsers[1].id;

    const newReviews = raw.reviews.filter((r) => {
        if (r.mediaType === "tv" && r.seasonNumber !== undefined && r.seasonNumber !== null) {
            return !existingReviewKeys.has(`${r.tmdbId}_s${r.seasonNumber}_${r.dateWatched}`);
        }
        return !existingReviewKeys.has(`${r.tmdbId}_${r.dateWatched}`);
    });

    const newWatchlist = raw.watchlist.filter((w) => {
        if (existingWatchlistTmdbIds.has(w.tmdbId)) return false;
        if (w.mediaType !== "tv" && allWatchedMovieTmdbIds.has(w.tmdbId)) return false;
        return true;
    });

    const existingProgressKeys = new Set(
        currentProgress.map((p) => `${p.tmdbId}_s${p.seasonNumber}`)
    );
    const newSeriesProgress = (raw.seriesProgress ?? []).filter(
        (sp) => !existingProgressKeys.has(`${sp.tmdbId}_s${sp.seasonNumber}`)
    );

    await prisma.$transaction([
        ...newReviews.map((review) => {
            const recommenderId =
                review.recommendedById === importUser1Id
                    ? defaultRecommenderId
                    : secondRecommenderId;

            return prisma.movieReview.create({
                data: {
                    id: review.id,
                    tmdbId: review.tmdbId,
                    title: review.title,
                    posterPath: review.posterPath,
                    dateWatched: review.dateWatched,
                    ratingUser1: review.ratingUser1,
                    ratingUser2: review.ratingUser2,
                    textReview: review.textReview,
                    genres: JSON.stringify(review.genres ?? []),
                    platform: review.platform?.trim() || null,
                    runtime: typeof review.runtime === "number" && review.runtime > 0 ? review.runtime : null,
                    releaseDate: review.releaseDate || null,
                    overview: review.overview || null,
                    recommendedById: recommenderId,
                    mediaType: review.mediaType || "movie",
                    seasonNumber: review.seasonNumber ?? null,
                    seasonName: review.seasonName ?? null,
                    totalEpisodes: review.totalEpisodes ?? null,
                    episodesWatched: review.episodesWatched ?? null,
                    runtimePerEpisode: review.runtimePerEpisode ?? null,
                    watchedDates: Array.isArray(review.watchedDates)
                        ? JSON.stringify([...review.watchedDates].sort())
                        : (review.watchedDates || null),
                    status: review.status || "completed",
                    abandonedReason: review.abandonedReason || null,
                    seriesProgressId: review.seriesProgressId || null
                }
            });
        }),
        ...newWatchlist.map((item) => {
            const addedBy =
                item.addedById && item.addedById === importUser1Id
                    ? defaultRecommenderId
                    : item.addedById
                    ? secondRecommenderId
                    : defaultRecommenderId;

            return prisma.watchlistItem.create({
                data: {
                    id: item.id,
                    tmdbId: item.tmdbId,
                    title: item.title,
                    posterPath: item.posterPath,
                    genres: JSON.stringify(item.genres ?? []),
                    runtime: typeof item.runtime === "number" && item.runtime > 0 ? item.runtime : null,
                    releaseDate: item.releaseDate || null,
                    overview: item.overview || null,
                    mediaType: item.mediaType || "movie",
                    numberOfSeasons: item.numberOfSeasons ?? null,
                    numberOfEpisodes: item.numberOfEpisodes ?? null,
                    addedById: addedBy
                }
            });
        }),
        ...newSeriesProgress.map((sp) =>
            prisma.seriesProgress.create({
                data: {
                    id: sp.id,
                    tmdbId: sp.tmdbId,
                    title: sp.title,
                    posterPath: sp.posterPath,
                    backdropPath: sp.backdropPath || null,
                    genres: JSON.stringify(sp.genres ?? []),
                    overview: sp.overview || null,
                    firstAirDate: sp.firstAirDate || null,
                    seasonNumber: sp.seasonNumber ?? 1,
                    seasonName: sp.seasonName || `${sp.seasonNumber ?? 1}ª Temporada`,
                    totalEpisodes: sp.totalEpisodes ?? 1,
                    currentEpisode: sp.currentEpisode ?? 0,
                    runtimePerEpisode: sp.runtimePerEpisode ?? 45,
                    platform: sp.platform || null,
                    status: sp.status || "watching",
                    checkins: sp.checkins && sp.checkins.length > 0 ? {
                        create: sp.checkins.map((c) => ({
                            id: c.id,
                            dateWatched: c.dateWatched,
                            episodeStart: c.episodeStart,
                            episodeEnd: c.episodeEnd,
                            episodeTag: c.episodeTag
                        }))
                    } : undefined
                }
            })
        )
    ]);

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/configuracoes");

    return {
        addedReviews: newReviews.length,
        addedWatchlist: newWatchlist.length,
        addedSeriesProgress: newSeriesProgress.length
    };
}

/**
 * Remove todos os dados do banco (reviews, watchlist e usuários),
 * permitindo recomeçar o onboarding do zero.
 */
export async function resetDatabase(): Promise<void> {
    await prisma.$transaction([
        prisma.seriesCheckin.deleteMany(),
        prisma.seriesProgress.deleteMany(),
        prisma.movieReview.deleteMany(),
        prisma.watchlistItem.deleteMany(),
        prisma.user.deleteMany()
    ]);

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/configuracoes");
}

/**
 * Verifica se a chave do TMDB está configurada no ambiente.
 */
export async function checkTmdbStatus(): Promise<{ configured: boolean; message: string }> {
    const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const token = process.env.TMDB_READ_ACCESS_TOKEN;

    if (key && key !== "sua_chave_tmdb_aqui" && key.trim() !== "") {
        return { configured: true, message: "Chave TMDB API ativa" };
    }
    if (token && token.trim() !== "") {
        return { configured: true, message: "Bearer token TMDB ativo" };
    }

    return { configured: false, message: "Chave TMDB não configurada (usando placeholder)" };
}
