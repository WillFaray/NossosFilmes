import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}"
    ],
    theme: {
        extend: {
            colors: {
                // Superfícies cinematográficas premium
                surface: "hsl(0 0% 100%)",
                "surface-dark": "hsl(230 22% 5%)",
                card: "hsl(0 0% 99%)",
                "card-dark": "hsl(228 18% 9%)",
                // Destaque dourado suave (estrelas, CTA)
                gold: {
                    50: "hsl(48 100% 96%)",
                    100: "hsl(48 100% 90%)",
                    200: "hsl(46 100% 80%)",
                    300: "hsl(45 95% 70%)",
                    400: "hsl(43 90% 60%)",
                    500: "hsl(42 85% 52%)",
                    600: "hsl(40 80% 42%)",
                    700: "hsl(38 75% 34%)"
                },
                // Índigo sutil para acentos
                accent: {
                    300: "hsl(230 80% 78%)",
                    400: "hsl(232 70% 70%)",
                    500: "hsl(235 60% 60%)",
                    600: "hsl(238 55% 52%)"
                }
            },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"]
            },
            borderRadius: {
                xl: "0.75rem",
                "2xl": "1rem",
                "3xl": "1.5rem"
            },
            boxShadow: {
                glass: "0 8px 32px 0 rgba(0, 0, 0, 0.18)",
                "glass-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.28)",
                poster: "0 10px 30px -8px rgba(0, 0, 0, 0.45)",
                "poster-lg": "0 24px 60px -12px rgba(0, 0, 0, 0.6)"
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" }
                }
            },
            animation: {
                shimmer: "shimmer 2.5s ease-in-out infinite"
            }
        }
    },
    plugins: []
};

export default config;