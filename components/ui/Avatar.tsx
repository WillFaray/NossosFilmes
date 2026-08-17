"use client";

import { useState } from "react";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
    src: string;
    name: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-xl"
};

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    return (
        <div className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm dark:ring-gray-800 ${sizeClasses[size]} ${className}`}>
            {/* Fallback: iniciais atrás da imagem */}
            <span className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-500 to-accent-600 font-semibold text-white ${sizeClasses[size]}`}>
                {getInitials(name)}
            </span>
            {!imgError && src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={name}
                    className="relative h-full w-full object-cover"
                    onError={() => setImgError(true)}
                />
            )}
        </div>
    );
}