import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";

/** IDs do TMDB são numéricos positivos */
const TMDB_ID_PATTERN = /^\d{1,16}$/;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    if (!TMDB_ID_PATTERN.test(params.id)) {
        return NextResponse.json(
            { error: "ID inválido" },
            { status: 400 }
        );
    }

    const type = request.nextUrl.searchParams.get("type");

    try {
        if (type === "tv") {
            const tv = await getTvDetails(params.id);
            return NextResponse.json({ tv, movie: tv });
        }

        const movie = await getMovieDetails(params.id);
        return NextResponse.json({ movie });
    } catch (error) {
        console.error("TMDB movie details error:", error);
        return NextResponse.json(
            { error: "Falha ao buscar detalhes" },
            { status: 500 }
        );
    }
}
