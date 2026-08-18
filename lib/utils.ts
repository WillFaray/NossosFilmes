/**
 * Formata uma data ISO para o formato brasileiro (dd/mm/aaaa)
 */
export function formatDate(dateStr: string): string {
    // Quando a data é apenas "YYYY-MM-DD", o new Date() interpreta como UTC
    // e a conversão para o fuso local pode deslocar o dia (ex: UTC-4 → véspera).
    // Para evitar isso, montamos a data localmente a partir dos componentes.
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    const date = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

/**
 * Cria uma Date local a partir de uma string ISO (YYYY-MM-DD),
 * evitando o deslocamento de fuso horário do parsing UTC.
 */
export function parseDateOnly(dateStr: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (!match) return new Date(dateStr);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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