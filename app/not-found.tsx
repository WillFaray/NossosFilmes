import Link from "next/link";
import { Clapperboard, Film, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
                <Clapperboard size={36} />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white shadow">
                    404
                </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                Cena Não Encontrada
            </h1>

            <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Parece que esse rolo de filme se perdeu na sala de projeção ou a página que você tentou acessar não existe.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40"
                >
                    <Home size={16} />
                    Voltar ao Início
                </Link>
                <Link
                    href="/lista-de-interesse"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-card-dark dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    <Film size={16} />
                    Lista de Interesse
                </Link>
            </div>
        </div>
    );
}
