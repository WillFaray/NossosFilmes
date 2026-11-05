"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Erro capturado pela rota:", error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-xl shadow-rose-500/10 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                <AlertTriangle size={36} />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                Falha na Projeção
            </h1>

            <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Ocorreu um erro inesperado ao carregar esta página. Não se preocupe, seus dados continuam seguros.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                    onClick={() => reset()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    <RotateCcw size={16} />
                    Tentar Novamente
                </button>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-card-dark dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    <Home size={16} />
                    Ir para o Início
                </Link>
            </div>
        </div>
    );
}
