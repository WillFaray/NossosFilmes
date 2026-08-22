import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb";

/** IDs do TMDB são numéricos positivos */
const TMDB_ID_PATTERN = /^\d{1,16}$/;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    // Valida o ID antes de consultar o TMDB
    if (!TMDB_ID_PATTERN.test(params.id)) {
        return NextResponse.json(
            { error: "ID de filme inválido" },
            { status: 400 }
        );
    }

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