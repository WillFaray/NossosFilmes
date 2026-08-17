"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { setupUsers } from "@/lib/actions";

function ProfileFields({
    index,
    name,
    setName,
    avatar,
    setAvatar
}: {
    index: number;
    name: string;
    setName: (v: string) => void;
    avatar: string;
    setAvatar: (v: string) => void;
}) {
    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <UserRound size={20} />
                </span>
                <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Perfil {index}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Quem vai usar o app?
                    </p>
                </div>
            </div>

            <div className="mt-5 space-y-4">
                <div>
                    <label htmlFor={`user${index}Name`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Nome
                    </label>
                    <input
                        id={`user${index}Name`}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`Nome do Perfil ${index}`}
                        className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                    />
                </div>
                <div>
                    <label htmlFor={`user${index}Avatar`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        URL da Foto (Avatar)
                    </label>
                    <input
                        id={`user${index}Avatar`}
                        type="url"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://... (opcional)"
                        className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Se vazio, usamos uma imagem padrão.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SetupPage() {
    const router = useRouter();
    const [user1Name, setUser1Name] = useState("");
    const [user1Avatar, setUser1Avatar] = useState("");
    const [user2Name, setUser2Name] = useState("");
    const [user2Avatar, setUser2Avatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previews = [
        { name: user1Name, avatar: user1Avatar },
        { name: user2Name, avatar: user2Avatar }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user1Name.trim() || !user2Name.trim()) {
            setError("Preencha o nome dos dois perfis.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await setupUsers({
                user1Name,
                user1Avatar,
                user2Name,
                user2Avatar
            });
            router.push("/");
            router.refresh();
        } catch {
            setError("Não foi possível criar os perfis. Tente novamente.");
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8 py-8">
            {/* Logo */}
            <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                    <Clapperboard size={28} />
                </div>
                <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Bem-vindo ao <span className="text-indigo-500">NossosFilmes</span>!
                </h1>
                <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                    Configure os dois perfis que vão registrar e avaliar os filmes assistidos juntos.
                </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <ProfileFields
                        index={1}
                        name={user1Name}
                        setName={setUser1Name}
                        avatar={user1Avatar}
                        setAvatar={setUser1Avatar}
                    />
                    <ProfileFields
                        index={2}
                        name={user2Name}
                        setName={setUser2Name}
                        avatar={user2Avatar}
                        setAvatar={setUser2Avatar}
                    />
                </div>

                {/* Prévia dos avatares */}
                <div className="flex items-center justify-center gap-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    {previews.map((preview, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-white shadow-sm dark:ring-gray-800",
                                preview.avatar ? "" : "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
                            )}>
                                {preview.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={preview.avatar}
                                        alt={preview.name || `Perfil ${i + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-400">
                                        {preview.name ? preview.name.charAt(0).toUpperCase() : `${i + 1}`}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {preview.name || `Perfil ${i + 1}`}
                            </span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Criando perfis...
                            </>
                        ) : (
                            "Começar a usar"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}