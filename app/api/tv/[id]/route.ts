import { NextRequest, NextResponse } from "next/server";
import { getTvDetails } from "@/lib/tmdb";

/** IDs do TMDB são numéricos positivos */
const TMDB_ID_PATTERN = /^\d{1,16}$/;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    if (!TMDB_ID_PATTERN.test(params.id)) {
        return NextResponse.json(
            { error: "ID de série inválido" },
            { status: 400 }
        );
    }

    try {
        const tv = await getTvDetails(params.id);
        // Fornece `tv` e o alias `movie` para compatibilidade total com clientes existentes
        return NextResponse.json({ tv, movie: tv });
    } catch (error) {
        console.error("TMDB TV details error:", error);
        return NextResponse.json(
            { error: "Falha ao buscar detalhes da série" },
            { status: 500 }
        );
    }
}
