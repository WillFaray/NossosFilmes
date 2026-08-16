import { Star } from "lucide-react";

interface StarRatingProps {
    rating: number;
    max?: number;
    size?: number;
    className?: string;
}

export function StarRating({ rating, max = 5, size = 14, className = "" }: StarRatingProps) {
    return (
        <div className={`flex items-center gap-0.5 ${className}`} aria-label={`Nota ${rating} de ${max}`}>
            {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
                <Star
                    key={star}
                    size={size}
                    className={
                        star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                    }
                />
            ))}
        </div>
    );
}