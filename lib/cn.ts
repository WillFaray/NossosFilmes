/**
 * Utilitário para concatenar classes condicionalmente
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(" ");
}