import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const movie = await getMovieDetails(params.id);
        return NextResponse.json({ movie });
    } catch (error) {
        console.error("TMDB movie details error:", error);
        return NextResponse.json(
            { error: "Falha ao buscar detalhes do filme" },
            { status: 500 }
        );
    }
}