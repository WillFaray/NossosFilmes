import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarRatingProps {
    rating: number;
    max?: number;
    size?: number;
    className?: string;
}

export function StarRating({ rating, max = 5, size = 14, className = "" }: StarRatingProps) {
    const filledClassName = "fill-gold-400 text-gold-400 drop-shadow-[0_0_4px_rgba(240,180,50,0.4)]";
    const emptyClassName = "fill-gray-200 text-gray-200 dark:fill-white/10 dark:text-white/10";

    return (
        <div className={`flex items-center gap-0.5 ${className}`} aria-label={`Nota ${rating} de ${max}`}>
            {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
                const isFull = rating >= star;
                const isHalf = !isFull && rating >= star - 0.5;

                if (isHalf) {
                    return (
                        <span
                            key={star}
                            className="relative inline-flex"
                            style={{ width: size, height: size }}
                        >
                            <Star size={size} className={emptyClassName} />
                            <span
                                className="absolute inset-y-0 left-0 overflow-hidden"
                                style={{ width: size / 2 }}
                            >
                                <Star size={size} className={filledClassName} />
                            </span>
                        </span>
                    );
                }

                return (
                    <Star
                        key={star}
                        size={size}
                        className={cn(isFull ? filledClassName : emptyClassName)}
                    />
                );
            })}
        </div>
    );
}

export default StarRating;