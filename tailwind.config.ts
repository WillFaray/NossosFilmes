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
                surface: "hsl(0 0% 100%)",
                "surface-dark": "hsl(222 47% 7%)",
                card: "hsl(0 0% 99%)",
                "card-dark": "hsl(222 42% 10%)"
            },
            borderRadius: {
                xl: "0.75rem",
                "2xl": "1rem"
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: "0" },
                    to: { opacity: "1" }
                },
                scaleIn: {
                    from: { opacity: "0", transform: "scale(0.95)" },
                    to: { opacity: "1", transform: "scale(1)" }
                },
                slideUp: {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to: { opacity: "1", transform: "translateY(0)" }
                }
            },
            animation: {
                fadeIn: "fadeIn 0.3s ease-out",
                scaleIn: "scaleIn 0.2s ease-out",
                slideUp: "slideUp 0.3s ease-out"
            }
        }
    },
    plugins: []
};

export default config;