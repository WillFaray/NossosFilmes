import { NextRequest, NextResponse } from "next/server";
import { searchTv } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q") ?? "";

    if (!query.trim()) {
        return NextResponse.json({ results: [] });
    }

    try {
        const results = await searchTv(query);
        return NextResponse.json({ results });
    } catch (error) {
        console.error("TMDB TV search error:", error);
        return NextResponse.json(
            { error: "Falha ao buscar séries" },
            { status: 500 }
        );
    }
}
