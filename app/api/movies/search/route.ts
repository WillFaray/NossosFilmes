import { NextRequest, NextResponse } from "next/server";
import { searchMovies, searchMulti, searchTv } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const type = request.nextUrl.searchParams.get("type") ?? "movie";

    if (!query.trim()) {
        return NextResponse.json({ results: [] });
    }

    try {
        let results;
        if (type === "tv") {
            results = await searchTv(query);
        } else if (type === "multi") {
            results = await searchMulti(query);
        } else {
            results = await searchMovies(query);
        }
        return NextResponse.json({ results });
    } catch (error) {
        console.error("TMDB search error:", error);
        return NextResponse.json(
            { error: "Falha ao buscar mídia" },
            { status: 500 }
        );
    }
}
