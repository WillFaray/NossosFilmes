"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { User } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { updateUser } from "@/lib/actions";

interface EditProfileModalProps {
    open: boolean;
    onClose: () => void;
    user: User;
    onUpdated: (updated: User) => void;
}

export function EditProfileModal({ open, onClose, user, onUpdated }: EditProfileModalProps) {
    const [name, setName] = useState(user.name);
    const [avatarUrl, setAvatarUrl] = useState(user.avatar);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previewAvatar = avatarUrl.trim() || user.avatar;

    const handleSave = async () => {
        if (!name.trim()) {
            setError("O nome não pode ficar vazio.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const updated = await updateUser({
                id: user.id,
                name: name.trim(),
                avatarUrl: avatarUrl.trim() || undefined
            });

            onUpdated({
                id: updated.id,
                name: updated.name,
                avatar: updated.avatarUrl
            });

            onClose();
        } catch {
            setError("Não foi possível salvar as alterações.");
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <div className="p-6 sm:p-8 animate-slideUp">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Editar Perfil
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Atualize as informações de {user.name}
                </p>

                {/* Preview do avatar */}
                <div className="mt-6 flex items-center gap-4">
                    <Avatar src={previewAvatar} name={name || user.name} size="lg" className="h-16 w-16 text-xl" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Prévia do avatar
                    </p>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="editName" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Nome
                        </label>
                        <input
                            id="editName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome do perfil"
                            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                        />
                    </div>
                    <div>
                        <label htmlFor="editAvatar" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            URL da Foto (Avatar)
                        </label>
                        <input
                            id="editAvatar"
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://... (opcional)"
                            className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-card-dark dark:text-gray-100 dark:ring-gray-700"
                        />
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Se vazio, mantemos a imagem padrão.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save size={15} />
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}