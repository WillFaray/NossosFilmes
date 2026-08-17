"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarRatingInputProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    size?: number;
    label?: string;
}

/**
 * Input de avaliação com suporte a meia estrela (0.5, 1, 1.5, ..., 5).
 * Cada estrela tem duas metades clicáveis: esquerda (0.5) e direita (1.0).
 * O hover pré-visualiza o valor antes do clique.
 */
export function StarRatingInput({
    value,
    onChange,
    max = 5,
    size = 24,
    label
}: StarRatingInputProps) {
    // Pré-visualização ao passar o mouse (null = sem hover)
    const [preview, setPreview] = useState<number | null>(null);

    const displayValue = preview ?? value;

    const filledClassName =
        "fill-gold-400 text-gold-400 drop-shadow-[0_0_6px_rgba(240,180,50,0.5)]";
    const emptyClassName =
        "fill-gray-200 text-gray-200 dark:fill-white/10 dark:text-white/10";

    return (
        <div>
            {label && (
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {label}
                </span>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <div
                    className="relative inline-flex items-center"
                    onMouseLeave={() => setPreview(null)}
                    role="radiogroup"
                    aria-label={label ?? "Avaliação"}
                >
                    {/* Estrelas visuais (preenchidas conforme o valor/preview) */}
                    <div className="pointer-events-none flex items-center gap-0.5">
                        {Array.from({ length: max }, (_, i) => {
                            const star = i + 1;
                            const isFull = displayValue >= star;
                            const isHalf = !isFull && displayValue >= star - 0.5;

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

                    {/* Botões invisíveis sobre as metades das estrelas */}
                    <div className="absolute inset-0 flex items-center">
                        {Array.from({ length: max }, (_, i) => {
                            const star = i + 1;
                            return (
                                <div key={star} className="flex" style={{ width: size + 2, height: size + 2 }}>
                                    {/* Metade esquerda → meia estrela */}
                                    <button
                                        type="button"
                                        onClick={() => onChange(star - 0.5)}
                                        onMouseEnter={() => setPreview(star - 0.5)}
                                        onFocus={() => setPreview(star - 0.5)}
                                        onBlur={() => setPreview(null)}
                                        className="h-full w-1/2 rounded-l-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                                        aria-label={`${star - 0.5} estrela${star - 0.5 > 1 ? "s" : ""}`}
                                        aria-checked={displayValue === star - 0.5}
                                        role="radio"
                                    />
                                    {/* Metade direita → estrela cheia */}
                                    <button
                                        type="button"
                                        onClick={() => onChange(star)}
                                        onMouseEnter={() => setPreview(star)}
                                        onFocus={() => setPreview(star)}
                                        onBlur={() => setPreview(null)}
                                        className="h-full w-1/2 rounded-r-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                                        aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                                        aria-checked={displayValue === star}
                                        role="radio"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {value > 0 ? `${value.toFixed(1).replace(".", ",")}/${max}` : "Avaliar"}
                </span>
            </div>
        </div>
    );
}

export default StarRatingInput;