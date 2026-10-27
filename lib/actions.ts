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
    assert(genres.length <= GENRE_MAX, `Máximo de ${GENRE_MAX} gêneros por filme.`);
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
    assert(isNonEmptyString(input.tmdbId), "ID do filme inválido.");
    assert(input.tmdbId.length <= 32, "ID do filme excede o limite de caracteres.");
    assert(isNonEmptyString(input.title), "Título do filme inválido.");
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
    const firstUser = await prisma.user.findFirst({ select: { id: true } });
    if (!firstUser) {
        throw new Error("Nenhum usuário cadastrado.");
    }

    assert(isNonEmptyString(input.tmdbId), "ID do filme inválido.");
    assert(isNonEmptyString(input.title), "Título do filme inválido.");

    const item = await prisma.watchlistItem.create({
        data: {
            tmdbId: input.tmdbId,
            title: input.title,
            posterPath: input.posterPath,
            genres: JSON.stringify(validateGenres(input.genres)),
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
 * Permite múltiplas sessões do mesmo filme: cada chamada cria um novo registro.
 * A criação e a remoção da watchlist acontecem na mesma transação.
 */
export async function addMovieReview(input: MovieReviewInput): Promise<DbMovieReview> {
    validateReviewInput(input);
    await assertRecommenderExists(input.recommendedById);

    const [, review] = await prisma.$transaction([
        // Remove o filme da watchlist, se estiver lá
        prisma.watchlistItem.deleteMany({
            where: { tmdbId: input.tmdbId }
        }),
        prisma.movieReview.create({
            data: {
                tmdbId: input.tmdbId,
                title: input.title,
                posterPath: input.posterPath,
                dateWatched: input.dateWatched,
                ratingUser1: input.ratingUser1,
                ratingUser2: input.ratingUser2,
                textReview: input.textReview.trim(),
                genres: JSON.stringify(input.genres),
                recommendedById: input.recommendedById
            }
        })
    ]);

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
    validateReviewInput(input);
    await assertRecommenderExists(input.recommendedById);

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

/**
 * Valida completamente um arquivo de importação:
 * estrutura, exatamente dois usuários, IDs únicos, notas (0,5–5), datas válidas,
 * textos (≤280), gêneros, URLs, usuários referenciados e limites de tamanho.
 */
function validateImportData(raw: unknown): asserts raw is ExportData {
    assert(typeof raw === "object" && raw !== null, "Arquivo de importação inválido.");
    const data = raw as Partial<ExportData>;

    assert(Array.isArray(data.users), "Lista de usuários ausente no arquivo.");
    assert(Array.isArray(data.reviews), "Lista de registros ausente no arquivo.");
    assert(Array.isArray(data.watchlist), "Lista de interesse ausente no arquivo.");

    // Exatamente dois usuários (a aplicação é para um casal)
    assert(data.users!.length === 2, "O arquivo deve conter exatamente dois usuários.");

    // Limites de tamanho
    assert(data.reviews!.length <= MAX_REVIEWS, `Máximo de ${MAX_REVIEWS} registros por arquivo.`);
    assert(data.watchlist!.length <= MAX_WATCHLIST, `Máximo de ${MAX_WATCHLIST} filmes na lista.`);

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
        assert(isNonEmptyString(review.tmdbId), `Registro "${review.title ?? ""}" sem ID do filme.`);
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

        assert(
            isNonEmptyString(review.recommendedById) && userIds.has(review.recommendedById),
            `Registro "${review.title}" referencia um usuário inexistente.`
        );
    }

    const reviewIds = new Set(data.reviews!.map((r) => r.id));
    assert(reviewIds.size === data.reviews!.length, "Existem registros com ID duplicado no arquivo.");

    // Watchlist: IDs e tmdbIds únicos, sem conflito com registros já assistidos
    const watchlistTmdbIds = new Set<string>();
    for (const item of data.watchlist!) {
        assert(isNonEmptyString(item?.id), "Item da lista com ID inválido.");
        assert(isNonEmptyString(item.tmdbId), "Item da lista sem ID do filme.");
        assert(!watchlistTmdbIds.has(item.tmdbId), `Filme duplicado na lista de interesse: "${item.title}".`);
        watchlistTmdbIds.add(item.tmdbId);

        assert(isNonEmptyString(item.title), "Item da lista com título inválido.");
        assert(item.title.length <= TITLE_MAX, `Título excede ${TITLE_MAX} caracteres.`);
        assert(
            typeof item.posterPath === "string" && item.posterPath.length <= URL_MAX,
            `Caminho do pôster excede ${URL_MAX} caracteres.`
        );
        validateGenres(item.genres);
    }

    for (const review of data.reviews!) {
        assert(
            !watchlistTmdbIds.has(review.tmdbId),
            `"${review.title}" não pode estar simultaneamente assistido e na lista de interesse.`
        );
    }
}

/**
 * Importa dados de um backup JSON, substituindo todo o conteúdo atual do banco.
 * A operação é atômica: ou tudo é importado, ou nada muda.
 */
export async function importData(raw: unknown): Promise<{ users: number; reviews: number; watchlist: number }> {
    // Limite de tamanho do payload serializado
    let serialized: string;
    try {
        serialized = JSON.stringify(raw);
    } catch {
        throw new Error("Arquivo de importação inválido.");
    }
    assert(
        Buffer.byteLength(serialized, "utf8") <= MAX_IMPORT_BYTES,
        "Arquivo de importação muito grande (máximo de 10 MB)."
    );

    validateImportData(raw);

    const firstUser = raw.users[0];

    await prisma.$transaction([
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
                    addedById: firstUser.id
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