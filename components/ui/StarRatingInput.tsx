"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarRatingInputProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    size?: number;
    label?: string;
}

export function StarRatingInput({
    value,
    onChange,
    max = 5,
    size = 24,
    label
}: StarRatingInputProps) {
    return (
        <div>
            {label && (
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {label}
                </span>
            )}
            <div className="flex items-center gap-1">
                {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className="group/star rounded-full p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                    >
                        <Star
                            size={size}
                            className={cn(
                                "transition-colors",
                                star <= value
                                    ? "fill-gold-400 text-gold-400 drop-shadow-[0_0_6px_rgba(240,180,50,0.5)]"
                                    : "fill-gray-200 text-gray-200 group-hover/star:fill-gold-200 group-hover/star:text-gold-200 dark:fill-white/10 dark:text-white/10 dark:group-hover/star:fill-gold-300/40 dark:group-hover/star:text-gold-300/40"
                            )}
                        />
                    </button>
                ))}
                <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {value > 0 ? `${value}/${max}` : "Avaliar"}
                </span>
            </div>
        </div>
    );
}