import type { User, Movie, Review } from "@/types";

export const users: User[] = [
    {
        id: "user-1",
        name: "Ana Souza",
        avatar: "https://i.pravatar.cc/150?img=47"
    },
    {
        id: "user-2",
        name: "Bruno Lima",
        avatar: "https://i.pravatar.cc/150?img=12"
    }
];

export const movies: Movie[] = [
    {
        id: "movie-1",
        title: "Interestelar",
        poster_path: "/6ricSDD83BClJsFdGB6x7cM0MFQ.jpg",
        release_date: "2014-11-06",
        genres: ["Ficção Científica", "Aventura", "Drama"]
    },
    {
        id: "movie-2",
        title: "Parasita",
        poster_path: "/igw938inb6Fy0YVcwIyxQ7Lu5FO.jpg",
        release_date: "2019-05-30",
        genres: ["Drama", "Suspense", "Comédia"]
    },
    {
        id: "movie-3",
        title: "O Poderoso Chefão",
        poster_path: "/oJagOzBu9Rdd9BrciseCm3U3MCU.jpg",
        release_date: "1972-03-24",
        genres: ["Crime", "Drama"]
    },
    {
        id: "movie-4",
        title: "A Origem",
        poster_path: "/9e3Dz7aCANy5aRUQF745IlNloJ1.jpg",
        release_date: "2010-07-16",
        genres: ["Ação", "Ficção Científica", "Suspense"]
    },
    {
        id: "movie-5",
        title: "Whiplash: Em Busca da Perfeição",
        poster_path: "/2msJb27jMeuA101ox4MuTQK4mDa.jpg",
        release_date: "2014-10-10",
        genres: ["Drama", "Música"]
    },
    {
        id: "movie-6",
        title: "Clube da Luta",
        poster_path: "/mCICnh7QBH0gzYaTQChBDDVIKdm.jpg",
        release_date: "1999-10-15",
        genres: ["Drama", "Suspense"],
        overview:
            "Um homem entediado com sua vida corporativa cruza o caminho de Tyler Durden, um vendedor de sabonetes excêntrico e carismático. Juntos, eles criam um clube de luta clandestino que rapidamente se transforma em um movimento muito maior."
    },
    {
        id: "movie-7",
        title: "Blade Runner 2049",
        poster_path: "/49pANIZXRAdHUiWjjBv4vxPeqRC.jpg",
        release_date: "2017-10-05",
        genres: ["Ficção Científica", "Drama"],
        overview:
            "Trinta anos após os eventos do primeiro filme, um novo blade runner, K, descobre um segredo que pode mergulhar a sociedade no caos. Sua busca o leva a Rick Deckard, um blade runner aposentado há 30 anos."
    },
    {
        id: "movie-8",
        title: "O Grande Hotel Budapeste",
        poster_path: "/yabOguSrb8ffUXCkI6t8Rw7xtSh.jpg",
        release_date: "2014-03-07",
        genres: ["Comédia", "Drama"],
        overview:
            "O Grande Hotel Budapeste narra as aventuras de Gustave H., um lendário concierge de um famoso hotel europeu entre as guerras, e de Zero Moustafa, o menino do saguão que se torna seu amigo e protegido."
    }
];

export const reviews: Review[] = [
    {
        id: "review-1",
        movieId: "movie-1",
        dateWatched: "2026-08-02",
        ratingUser1: 5,
        ratingUser2: 5,
        textReview:
            "Uma obra-prima visual e emocional. A trilha sonora e a fotografia de Hoyte van Hoytema nos transportam para o espaço de forma inesquecível.",
        recommendedBy: "user-1"
    },
    {
        id: "review-2",
        movieId: "movie-2",
        dateWatched: "2026-08-05",
        ratingUser1: 5,
        ratingUser2: 4,
        textReview:
            "Uma crítica social afiada e genial escondida em um thriller de suspense. A direção de Bong Joon-ho é impecável do início ao fim.",
        recommendedBy: "user-2"
    },
    {
        id: "review-3",
        movieId: "movie-3",
        dateWatched: "2026-08-09",
        ratingUser1: 5,
        ratingUser2: 5,
        textReview:
            "Um clássico absoluto do cinema. O retrato da família Corleone é atemporal e a atuação de Marlon Brando é lendária.",
        recommendedBy: "user-1"
    },
    {
        id: "review-4",
        movieId: "movie-4",
        dateWatched: "2026-08-12",
        ratingUser1: 4,
        ratingUser2: 5,
        textReview:
            "Mind-bending do início ao fim. A estrutura de sonhos dentro de sonhos é fascinante e o final abre espaço para infinitas discussões.",
        recommendedBy: "user-2"
    },
    {
        id: "review-5",
        movieId: "movie-5",
        dateWatched: "2026-08-15",
        ratingUser1: 5,
        ratingUser2: 4,
        textReview:
            "Intenso e eletrizante. A dinâmica entre o maestro Fletcher e o baterista Andrew Neiman é de tirar o fôlego.",
        recommendedBy: "user-2"
    }
];