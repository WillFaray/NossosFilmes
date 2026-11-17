import { USER_1, USER_2 } from "./base-users";

export const SAMPLE_MOVIES = {
    interstellar: {
        tmdbId: "157336",
        title: "Interestelar",
        posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        dateWatched: "2026-11-01",
        ratingUser1: 5.0,
        ratingUser2: 4.5,
        textReview: "Uma jornada visual e emocional inacreditável no espaço.",
        genres: ["Ficção científica", "Drama", "Aventura"],
        recommendedById: USER_1.id,
        platform: "Max",
        runtime: 169,
        releaseDate: "2014-11-05",
        overview: "As reservas naturais da Terra estão chegando ao fim..."
    },
    parasite: {
        tmdbId: "496243",
        title: "Parasita",
        posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        dateWatched: "2026-11-05",
        ratingUser1: 5.0,
        ratingUser2: 5.0,
        textReview: "Obra-prima do cinema moderno, roteiro impecável.",
        genres: ["Comédia", "Suspense", "Drama"],
        recommendedById: USER_2.id,
        platform: "Netflix",
        runtime: 132,
        releaseDate: "2019-05-30",
        overview: "Toda a família de Ki-taek está desempregada..."
    },
    dune2: {
        tmdbId: "693134",
        title: "Duna: Parte 2",
        posterPath: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
        dateWatched: "2026-11-20",
        ratingUser1: 4.5,
        ratingUser2: 5.0,
        textReview: "Épico espetacular com cinematografia incomparável.",
        genres: ["Ficção científica", "Aventura"],
        recommendedById: USER_1.id,
        platform: "Max",
        runtime: 166,
        releaseDate: "2024-02-27",
        overview: "Paul Atreides se une a Chani e aos Fremen..."
    }
};
