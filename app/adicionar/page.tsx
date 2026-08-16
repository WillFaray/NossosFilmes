import { PlusCircle } from "lucide-react";
import { AddEntryForm } from "@/components/add-entry/AddEntryForm";

export default function AddEntryPage() {
    return (
        <div className="space-y-8">
            {/* Cabeçalho da página */}
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <PlusCircle size={20} />
                    </span>
                    Adicionar Registro
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Busque um filme no TMDB e registre a sessão assistida
                </p>
            </div>

            <AddEntryForm />
        </div>
    );
}