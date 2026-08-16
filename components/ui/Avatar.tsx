"use client";

import Image from "next/image";
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
    return (
        <div className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm ${sizeClasses[size]} ${className}`}>
            <span className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white ${sizeClasses[size]}`}>
                {getInitials(name)}
            </span>
            <Image
                src={src}
                alt={name}
                fill
                sizes="(max-width: 64px) 100vw"
                className="object-cover"
                onError={(e) => {
                    // Fallback: oculta a imagem e exibe as iniciais
                    (e.target as HTMLImageElement).style.display = "none";
                }}
            />
        </div>
    );
}