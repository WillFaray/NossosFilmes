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
 * Se o filme já tiver sido registrado (mesmo tmdbId), atualiza o registro.
 */
export async function addMovieReview(input: MovieReviewInput): Promise<DbMovieReview> {
    // Remove o filme da watchlist, se estiver lá
    await prisma.watchlistItem.deleteMany({
        where: { tmdbId: input.tmdbId }
    });

    const review = await prisma.movieReview.create({
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
