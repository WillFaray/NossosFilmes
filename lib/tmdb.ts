import type { Movie, TvSeason, TvShow } from "@/types";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TMDBMovieResult {
    id: number;
    title: string;
    poster_path: string | null;
    backdrop_path?: string | null;
    release_date: string;
    overview?: string;
    genre_ids?: number[];
    genres?: { id: number; name: string }[];
    runtime?: number;
}

interface TMDBTvResult {
    id: number;
    name: string;
    original_name?: string;
    poster_path: string | null;
    backdrop_path?: string | null;
    first_air_date: string;
    overview?: string;
    genre_ids?: number[];
    genres?: { id: number; name: string }[];
    number_of_seasons?: number;
    number_of_episodes?: number;
    episode_run_time?: number[];
    last_episode_to_air?: {
        id: number;
        name: string;
        runtime?: number | null;
        episode_number: number;
        season_number: number;
    } | null;
    next_episode_to_air?: {
        id: number;
        name: string;
        runtime?: number | null;
        episode_number: number;
        season_number: number;
    } | null;
    seasons?: Array<{
        id: number;
        name: string;
        overview: string;
        poster_path: string | null;
        season_number: number;
        episode_count: number;
        air_date?: string | null;
    }>;
}

interface TMDBMultiResult {
    id: number;
    media_type: "movie" | "tv" | "person";
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
    genre_ids?: number[];
    genres?: { id: number; name: string }[];
}

const GENRE_MAP: Record<number, string> = {
    // Filmes & Geral
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
    37: "Faroeste",
    // Séries de TV (IDs 10759..10768)
    10759: "Ação e Aventura",
    10762: "Infantil",
    10763: "Notícias",
    10764: "Reality Show",
    10765: "Ficção Científica e Fantasia",
    10766: "Novela",
    10767: "Talk Show",
    10768: "Guerra e Política"
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
        backdrop_path: movie.backdrop_path ?? null,
        release_date: movie.release_date || "",
        genres,
        overview: movie.overview || undefined,
        runtime: typeof movie.runtime === "number" && movie.runtime > 0 ? movie.runtime : undefined,
        mediaType: "movie"
    };
}

function mapTv(tv: TMDBTvResult): TvShow {
    const genres = tv.genres
        ? tv.genres.map((g) => g.name)
        : (tv.genre_ids ?? [])
            .map((id) => GENRE_MAP[id])
            .filter((name): name is string => Boolean(name));

    let runtimePerEpisode: number | undefined = undefined;
    if (Array.isArray(tv.episode_run_time) && tv.episode_run_time.length > 0 && tv.episode_run_time[0] > 0) {
        runtimePerEpisode = tv.episode_run_time[0];
    } else if (tv.last_episode_to_air?.runtime && tv.last_episode_to_air.runtime > 0) {
        runtimePerEpisode = tv.last_episode_to_air.runtime;
    } else if (tv.next_episode_to_air?.runtime && tv.next_episode_to_air.runtime > 0) {
        runtimePerEpisode = tv.next_episode_to_air.runtime;
    }

    const seasons: TvSeason[] | undefined = tv.seasons
        ? tv.seasons
              .map((s) => ({
                  id: s.id,
                  name: s.name || `Temporada ${s.season_number}`,
                  overview: s.overview || "",
                  poster_path: s.poster_path ?? tv.poster_path ?? "",
                  season_number: s.season_number,
                  episode_count: s.episode_count ?? 0,
                  air_date: s.air_date ?? null
              }))
              .sort((a, b) => a.season_number - b.season_number)
        : undefined;

    return {
        id: String(tv.id),
        title: tv.name,
        name: tv.name,
        poster_path: tv.poster_path ?? "",
        backdrop_path: tv.backdrop_path ?? null,
        release_date: tv.first_air_date || "",
        first_air_date: tv.first_air_date || "",
        genres,
        overview: tv.overview || undefined,
        mediaType: "tv",
        numberOfSeasons: tv.number_of_seasons,
        numberOfEpisodes: tv.number_of_episodes,
        runtimePerEpisode,
        runtime: runtimePerEpisode ?? 45,
        seasons
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
 * Retorna os detalhes de um filme específico pelo ID
 */
export async function getMovieDetails(id: string | number): Promise<Movie> {
    const data = await tmdbFetch(`/movie/${id}`, {
        language: "pt-BR"
    });

    return mapMovie(data);
}

/**
 * Busca séries pelo nome (search)
 */
export async function searchTv(query: string): Promise<TvShow[]> {
    if (!query.trim()) return [];

    const data = await tmdbFetch("/search/tv", {
        query: query.trim(),
        language: "pt-BR",
        include_adult: "false",
        page: "1"
    });

    return (data.results ?? []).slice(0, 8).map(mapTv);
}

/**
 * Retorna os detalhes de uma série específica pelo ID (incluindo temporadas e duração por episódio)
 */
export async function getTvDetails(id: string | number): Promise<TvShow> {
    const data = await tmdbFetch(`/tv/${id}`, {
        language: "pt-BR"
    });

    return mapTv(data);
}

/**
 * Busca combinada (filmes e séries), filtrando pessoas
 */
export async function searchMulti(query: string): Promise<Movie[]> {
    if (!query.trim()) return [];

    const data = await tmdbFetch("/search/multi", {
        query: query.trim(),
        language: "pt-BR",
        include_adult: "false",
        page: "1"
    });

    const items: Movie[] = [];
    for (const item of (data.results ?? []) as TMDBMultiResult[]) {
        if (item.media_type === "movie") {
            items.push(mapMovie(item as TMDBMovieResult));
        } else if (item.media_type === "tv") {
            items.push(mapTv(item as TMDBTvResult));
        }
        if (items.length >= 8) break;
    }

    return items;
}
