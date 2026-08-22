"use server";

import { prisma } from "./db";
import { revalidatePath } from "next/cache";

export interface MovieReviewInput {
    tmdbId: string;
    title: string;
    posterPath: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    genres: string[];
    recommendedById: string;
}

export interface DbUser {
    id: string;
    name: string;
    avatarUrl: string;
}

export interface DbMovieReview {
    id: string;
    tmdbId: string;
    title: string;
    posterPath: string;
    dateWatched: string;
    ratingUser1: number;
    ratingUser2: number;
    textReview: string;
    genres: string[];
    recommendedById: string;
}

export interface DbWatchlistItem {
    id: string;
    tmdbId: string;
    title: string;
    posterPath: string;
    genres: string[];
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
}): DbMovieReview {
    return {
        ...review,
        genres: JSON.parse(review.genres || "[]") as string[]
    };
}

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

/** Busca todos os itens da watchlist */
export async function getWatchlist(): Promise<DbWatchlistItem[]> {
    const items = await prisma.watchlistItem.findMany({
        orderBy: { createdAt: "desc" }
    });

    return items.map((item) => ({
        ...item,
        genres: JSON.parse(item.genres || "[]") as string[]
    }));
}

/** Adiciona um filme à watchlist */
export async function addToWatchlist(input: {
    tmdbId: string;
    title: string;
    posterPath: string;
    genres: string[];
}): Promise<DbWatchlistItem> {
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
        throw new Error("Nenhum usuário cadastrado.");
    }

    const item = await prisma.watchlistItem.create({
        data: {
            tmdbId: input.tmdbId,
            title: input.title,
            posterPath: input.posterPath,
            genres: JSON.stringify(input.genres),
            addedById: firstUser.id
        }
    });

    revalidatePath("/lista-de-interesse");
    revalidatePath("/");

    return {
        ...item,
        genres: JSON.parse(item.genres || "[]") as string[]
    };
}

/** Remove um filme da watchlist (pelo tmdbId) */
export async function removeFromWatchlist(tmdbId: string): Promise<void> {
    await prisma.watchlistItem.deleteMany({
        where: { tmdbId }
    });

    revalidatePath("/lista-de-interesse");
    revalidatePath("/");
}

/** Remove um filme da watchlist (pelo id do registro) */
export async function deleteWatchlistItem(id: string): Promise<void> {
    await prisma.watchlistItem.delete({
        where: { id }
    });

    revalidatePath("/lista-de-interesse");
    revalidatePath("/");
}


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
 * Adiciona um novo registro de filme assistido.
 * Se o filme já tiver sido registrado (mesmo tmdbId), atualiza o registro existente
 * em vez de criar uma duplicata.
 */
export async function addMovieReview(input: MovieReviewInput): Promise<DbMovieReview> {
    // Remove o filme da watchlist, se estiver lá
    await prisma.watchlistItem.deleteMany({
        where: { tmdbId: input.tmdbId }
    });

    const review = await prisma.movieReview.upsert({
        where: { tmdbId: input.tmdbId },
        update: {
            title: input.title,
            posterPath: input.posterPath,
            dateWatched: input.dateWatched,
            ratingUser1: input.ratingUser1,
            ratingUser2: input.ratingUser2,
            textReview: input.textReview,
            genres: JSON.stringify(input.genres),
            recommendedById: input.recommendedById
        },
        create: {
            tmdbId: input.tmdbId,
            title: input.title,
            posterPath: input.posterPath,
            dateWatched: input.dateWatched,
            ratingUser1: input.ratingUser1,
            ratingUser2: input.ratingUser2,
            textReview: input.textReview,
            genres: JSON.stringify(input.genres),
            recommendedById: input.recommendedById
        }
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return serializeReview(review);
}

/** Atualiza um registro de filme assistido */
export async function updateMovieReview(
    id: string,
    input: MovieReviewInput
): Promise<DbMovieReview> {
    const review = await prisma.movieReview.update({
        where: { id },
        data: {
            tmdbId: input.tmdbId,
            title: input.title,
            posterPath: input.posterPath,
            dateWatched: input.dateWatched,
            ratingUser1: input.ratingUser1,
            ratingUser2: input.ratingUser2,
            textReview: input.textReview,
            genres: JSON.stringify(input.genres),
            recommendedById: input.recommendedById
        }
    });

    revalidatePath("/");
    revalidatePath("/lista-de-interesse");
    revalidatePath("/perfis");
    revalidatePath("/perfis/[id]");

    return serializeReview(review);
}

/** Remove um registro de filme assistido */
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
/* Exportação / Importação / Backup                                    */
/* ------------------------------------------------------------------ */

export interface ExportData {
    version: number;
    exportedAt: string;
    users: DbUser[];
    reviews: DbMovieReview[];
    watchlist: DbWatchlistItem[];
}

/** Exporta todos os dados da aplicação como JSON */
export async function exportData(): Promise<ExportData> {
    const [users, reviews, watchlist] = await Promise.all([
        getUsers(),
        getReviews(),
        getWatchlist()
    ]);

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        users,
        reviews: reviews.map(({ recommender: _recommender, ...review }) => review),
        watchlist
    };
}

function isExportData(value: unknown): value is ExportData {
    if (typeof value !== "object" || value === null) return false;
    const data = value as Partial<ExportData>;
    return (
        Array.isArray(data.users) &&
        Array.isArray(data.reviews) &&
        Array.isArray(data.watchlist) &&
        data.users.every((u) => typeof u?.id === "string" && typeof u?.name === "string" && typeof u?.avatarUrl === "string") &&
        data.reviews.every((r) => typeof r?.id === "string" && typeof r?.tmdbId === "string") &&
        data.watchlist.every((w) => typeof w?.id === "string" && typeof w?.tmdbId === "string")
    );
}

/**
 * Importa dados de um backup JSON, substituindo todo o conteúdo atual do banco.
 * A operação é atômica: ou tudo é importado, ou nada muda.
 */
export async function importData(raw: unknown): Promise<{ users: number; reviews: number; watchlist: number }> {
    if (!isExportData(raw)) {
        throw new Error("Arquivo de importação inválido.");
    }

    const firstUser = raw.users[0];
    if (!firstUser) {
        throw new Error("O arquivo de importação não contém usuários.");
    }

    // Garante que os ids referenciados existam após a substituição
    const userIds = new Set(raw.users.map((u) => u.id));
    for (const review of raw.reviews) {
        if (!userIds.has(review.recommendedById)) {
            throw new Error(`Registro "${review.title}" referencia um usuário inexistente.`);
        }
    }

    await prisma.$transaction([
        prisma.movieReview.deleteMany(),
        prisma.watchlistItem.deleteMany(),
        prisma.user.deleteMany(),
        ...raw.users.map((user) =>
            prisma.user.create({
                data: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }
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
                    addedById: userIds.has(item.id) ? item.id : firstUser.id
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
                    recommendedById: review.recommendedById
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
        watchlist: raw.watchlist.length
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

    const target = path.join(os.tmpdir(), `nossosfilmes-backup-${Date.now()}.db`);
    const safeTarget = target.replace(/'/g, "''");

    try {
        await prisma.$executeRawUnsafe(`VACUUM INTO '${safeTarget}'`);
        const buffer = await fs.readFile(target);
        return buffer.toString("base64");
    } finally {
        await fs.unlink(target).catch(() => undefined);
    }
}


