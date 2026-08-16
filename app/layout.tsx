import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ReviewProvider } from "@/components/reviews/ReviewProvider";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "NossosFilmes",
    description: "Registre os filmes assistidos por duas pessoas"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider>
                    <ReviewProvider>
                        <AppShell>{children}</AppShell>
                    </ReviewProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}