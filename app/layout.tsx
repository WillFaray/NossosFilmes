import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ReviewProvider } from "@/components/reviews/ReviewProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SetupRedirect } from "@/components/setup/SetupRedirect";
import { getAllSeriesProgress, getReviews, getUsers, getWatchlist } from "@/lib/actions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "NossosMomentos",
    description: "Registre os momentos do casal: filmes e séries assistidos juntos"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const [users, reviews, watchlist, seriesProgress] = await Promise.all([
        getUsers(),
        getReviews(),
        getWatchlist(),
        getAllSeriesProgress()
    ]);

    const needsSetup = users.length !== 2;

    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider>
                    <ReviewProvider
                        initialUsers={users}
                        initialReviews={reviews}
                        initialWatchlist={watchlist}
                        initialSeriesProgress={seriesProgress}
                    >
                        <SetupRedirect userCount={users.length}>
                            {needsSetup ? (
                                <main className="min-h-screen">{children}</main>
                            ) : (
                                <AppShell>{children}</AppShell>
                            )}
                        </SetupRedirect>
                    </ReviewProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}