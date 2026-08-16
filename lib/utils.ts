/**
 * Formata uma data ISO para o formato brasileiro (dd/mm/aaaa)
 */
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

/**
 * Retorna a URL completa do poster a partir do poster_path
 */
export function getPosterUrl(posterPath: string, size: "w342" | "w500" | "original" = "w500"): string {
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

/**
 * Retorna as iniciais de um nome para fallback do avatar
 */
export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}