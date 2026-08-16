import type { Movie } from "@/types";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TMDBMovieResult {
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
    overview?: string;
    genre_ids?: number[];
    genres?: { id: number; name: string }[];
}

const GENRE_MAP: Record<number, string> = {
    28: "Ação",
    12: "Aventura",
    16: "Animação",
    35: "Comédia",
    80: "Crime",
    99: "Documentário",
    18: "Drama",
    10751: "Família",
    14: "Fantasia",
    36: "História",
    27: "Terror",
    10402: "Música",
    9648: "Mistério",
    10749: "Romance",
    878: "Ficção Científica",
    10770: "Cinema TV",
    53: "Suspense",
    10752: "Guerra",
    37: "Faroeste"
};

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const headers: Record<string, string> = {
        accept: "application/json"
    };

    // Preferimos a API Key (v3) que está funcionando; usamos o Bearer token apenas como fallback
    if (TMDB_API_KEY) {
        url.searchParams.set("api_key", TMDB_API_KEY);
    } else if (TMDB_READ_ACCESS_TOKEN) {
        headers.authorization = `Bearer ${TMDB_READ_ACCESS_TOKEN}`;
    }

    const res = await fetch(url, {
        headers,
        next: { revalidate: 3600 }
    });

    if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

function mapMovie(movie: TMDBMovieResult): Movie {
    const genres = movie.genres
        ? movie.genres.map((g) => g.name)
        : (movie.genre_ids ?? [])
            .map((id) => GENRE_MAP[id])
            .filter((name): name is string => Boolean(name));

    return {
        id: String(movie.id),
        title: movie.title,
        poster_path: movie.poster_path ?? "",
        release_date: movie.release_date || "",
        genres,
        overview: movie.overview || undefined
    };
}

/**
 * Busca filmes pelo nome (search)
 */
export async function searchMovies(query: string): Promise<Movie[]> {
    if (!query.trim()) return [];

    const data = await tmdbFetch("/search/movie", {
        query: query.trim(),
        language: "pt-BR",
        include_adult: "false",
        page: "1"
    });

    return (data.results ?? []).slice(0, 8).map(mapMovie);
}

/**
 * Retorna os detalhes de um filme específico pelo ID (incluindo poster)
 */
export async function getMovieDetails(id: string | number): Promise<Movie> {
    const data = await tmdbFetch(`/movie/${id}`, {
        language: "pt-BR"
    });

    return mapMovie(data);
}