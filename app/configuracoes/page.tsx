"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    DatabaseBackup,
    Download,
    FileJson,
    GitMerge,
    KeyRound,
    Loader2,
    Pencil,
    Settings,
    Trash2,
    Upload,
    Users
} from "lucide-react";
import {
    backupDatabase,
    checkTmdbStatus,
    exportData,
    importData,
    mergeData,
    resetDatabase,
    type ExportData
} from "@/lib/actions";
import { useReviews } from "@/components/reviews/ReviewProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { EditProfileModal } from "@/components/profiles/EditProfileModal";
import type { User } from "@/types";

function downloadBlob(content: BlobPart, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, type: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
}

export default function SettingsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { users, reviews, watchlist, updateUser } = useReviews();

    const [exporting, setExporting] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [importing, setImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<{ data: ExportData; fileName: string } | null>(null);
    const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

    // Gestão de Perfis em Configurações
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Status da API TMDB
    const [tmdbStatus, setTmdbStatus] = useState<{ configured: boolean; message: string } | null>(null);

    // Modal de Reset do Banco
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetConfirmInput, setResetConfirmInput] = useState("");
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        checkTmdbStatus().then(setTmdbStatus).catch(() => null);
    }, []);

    const handleExport = async () => {
        setExporting(true);
        setMessage(null);
        try {
            const data = await exportData();
            const dateStamp = new Date().toISOString().slice(0, 10);
            downloadBlob(
                JSON.stringify(data, null, 2),
                `nossosfilmes-export-${dateStamp}.json`,
                "application/json"
            );
            setMessage({ kind: "success", text: "Dados exportados com sucesso em formato JSON." });
        } catch (error) {
            console.error("Erro ao exportar dados:", error);
            setMessage({ kind: "error", text: "Não foi possível exportar os dados." });
        } finally {
            setExporting(false);
        }
    };

    const handleBackup = async () => {
        setBackingUp(true);
        setMessage(null);
        try {
            const base64 = await backupDatabase();
            const dateStamp = new Date().toISOString().slice(0, 10);
            downloadBlob(
                base64ToBlob(base64, "application/x-sqlite3"),
                `nossosfilmes-backup-${dateStamp}.db`,
                "application/x-sqlite3"
            );
            setMessage({ kind: "success", text: "Backup físico do banco SQLite (.db) gerado com sucesso." });
        } catch (error) {
            console.error("Erro ao gerar backup:", error);
            setMessage({ kind: "error", text: "Não foi possível gerar o backup do banco." });
        } finally {
            setBackingUp(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setMessage(null);
        try {
            const parsed = JSON.parse(await file.text());
            if (
                typeof parsed !== "object" ||
                parsed === null ||
                !Array.isArray((parsed as ExportData).users) ||
                !Array.isArray((parsed as ExportData).reviews)
            ) {
                throw new Error("Formato inválido.");
            }
            setPendingImport({ data: parsed as ExportData, fileName: file.name });
        } catch (error) {
            console.error("Arquivo de importação inválido:", error);
            setMessage({
                kind: "error",
                text: "Arquivo inválido. Selecione um JSON exportado pelo NossosFilmes."
            });
        }
    };

    // Modo 1: Substituir tudo
    const handleReplaceImport = async () => {
        if (!pendingImport || importing) return;
        setImporting(true);
        setMessage(null);
        try {
            const result = await importData(pendingImport.data);
            setPendingImport(null);
            setMessage({
                kind: "success",
                text: `Substituição concluída: ${result.users} usuários, ${result.reviews} registros e ${result.watchlist} filmes na lista restaurados com sucesso.`
            });
            router.refresh();
        } catch (error) {
            console.error("Erro ao substituir dados:", error);
            setMessage({
                kind: "error",
                text: error instanceof Error ? error.message : "Não foi possível importar os dados."
            });
        } finally {
            setImporting(false);
        }
    };

    // Modo 2: Mesclar dados sem apagar atuais
    const handleMergeImport = async () => {
        if (!pendingImport || importing) return;
        setImporting(true);
        setMessage(null);
        try {
            const result = await mergeData(pendingImport.data);
            setPendingImport(null);
            setMessage({
                kind: "success",
                text: `Mesclagem concluída: ${result.addedReviews} novas sessões e ${result.addedWatchlist} novos filmes adicionados à lista sem remover os atuais.`
            });
            router.refresh();
        } catch (error) {
            console.error("Erro ao mesclar dados:", error);
            setMessage({
                kind: "error",
                text: error instanceof Error ? error.message : "Não foi possível mesclar os dados."
            });
        } finally {
            setImporting(false);
        }
    };

    // Redefinir banco de dados (Reset)
    const handleResetDatabase = async () => {
        if (resetConfirmInput !== "REINICIAR" || resetting) return;
        setResetting(true);
        setMessage(null);
        try {
            await resetDatabase();
            setResetModalOpen(false);
            setResetConfirmInput("");
            router.push("/setup");
        } catch (error) {
            console.error("Erro ao redefinir banco:", error);
            setMessage({ kind: "error", text: "Não foi possível redefinir o banco de dados." });
            setResetting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Cabeçalho da página */}
            <div>
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <Settings size={20} />
                    </span>
                    Configurações
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Gerencie os perfis da dupla, exporte backups, importe dados e monitore o sistema.
                </p>
            </div>

            {/* Mensagem de feedback */}
            {message && (
                <div
                    role="status"
                    className={`flex items-center justify-between rounded-xl p-4 text-sm ${
                        message.kind === "success"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    }`}
                >
                    <span>{message.text}</span>
                    <button
                        type="button"
                        onClick={() => setMessage(null)}
                        className="ml-3 text-xs font-semibold underline hover:opacity-80"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {/* Resumo do Sistema & Banco de Dados */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Users size={13} className="text-indigo-600 dark:text-indigo-400" />
                        Perfis
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {users.length} usuários
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">Configurados</p>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Database size={13} className="text-indigo-600 dark:text-indigo-400" />
                        Sessões
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {reviews.length} {reviews.length === 1 ? "filme" : "filmes"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">No diário</p>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <FileJson size={13} className="text-indigo-600 dark:text-indigo-400" />
                        Watchlist
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {watchlist.length} {watchlist.length === 1 ? "filme" : "filmes"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">Para assistir</p>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <KeyRound size={13} className="text-indigo-600 dark:text-indigo-400" />
                        TMDB API
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                        {tmdbStatus === null
                            ? "Verificando..."
                            : tmdbStatus.configured
                            ? "Conectada"
                            : "Pendente"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400 truncate" title={tmdbStatus?.message}>
                        {tmdbStatus?.configured ? "Chave configurada" : "Verifique o arquivo .env"}
                    </p>
                </div>
            </div>

            {/* Perfis da Dupla (Gestão Direta em Configurações) */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Perfis da Dupla
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800"
                        >
                            <div className="flex items-center gap-3">
                                <Avatar src={user.avatar} name={user.name} size="md" />
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {user.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {reviews.filter((r) => r.recommendedBy === user.id).length} indicações feitas
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingUser(user)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <Pencil size={13} />
                                Editar perfil
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Backup e Exportação */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Backup e Restauração de Dados
                </h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Exportação JSON */}
                    <section className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <FileJson size={20} />
                        </span>
                        <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Exportar dados (JSON)</h3>
                        <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">
                            Baixa todos os registros, perfis e lista de interesse em um arquivo JSON legível e portátil.
                        </p>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={exporting}
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {exporting ? "Exportando..." : "Baixar JSON"}
                        </button>
                    </section>

                    {/* Backup do SQLite */}
                    <section className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                            <DatabaseBackup size={20} />
                        </span>
                        <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Backup físico (.db)</h3>
                        <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">
                            Gera uma cópia física exata do banco SQLite (.db), ideal para restauração e segurança total.
                        </p>
                        <button
                            type="button"
                            onClick={handleBackup}
                            disabled={backingUp}
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {backingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {backingUp ? "Gerando..." : "Baixar .db"}
                        </button>
                    </section>

                    {/* Importação */}
                    <section className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                            <Upload size={20} />
                        </span>
                        <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">Importar dados</h3>
                        <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">
                            Carrega um arquivo JSON de backup. Você poderá escolher entre <strong>Mesclar novos itens</strong> ou <strong>Substituir tudo</strong>.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/json,.json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {importing ? "Importando..." : "Selecionar arquivo JSON"}
                        </button>
                    </section>
                </div>
            </div>

            {/* Painel de confirmação de importação (com opção de Mesclar ou Substituir) */}
            {pendingImport && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-6 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
                    <h3 className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle size={20} />
                        Arquivo de Backup Carregado: {pendingImport.fileName}
                    </h3>
                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                        O arquivo contém{" "}
                        <strong>{pendingImport.data.users.length} usuários</strong> (
                        {pendingImport.data.users.map((u) => u.name).join(" e ")}),{" "}
                        <strong>{pendingImport.data.reviews.length} sessões de filmes</strong> e{" "}
                        <strong>{pendingImport.data.watchlist.length} filmes na lista de interesse</strong>.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Opção 1: Mesclar */}
                        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-amber-200 dark:bg-card-dark dark:ring-amber-500/30">
                            <div>
                                <h4 className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                                    <GitMerge size={16} className="text-indigo-600 dark:text-indigo-400" />
                                    Mesclar Dados (Recomendado)
                                </h4>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Mantém todos os seus dados atuais e adiciona apenas novos filmes e sessões que não existiam antes.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleMergeImport}
                                disabled={importing}
                                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                            >
                                {importing && <Loader2 size={13} className="animate-spin" />}
                                Mesclar novos registros
                            </button>
                        </div>

                        {/* Opção 2: Substituir */}
                        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-amber-200 dark:bg-card-dark dark:ring-amber-500/30">
                            <div>
                                <h4 className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                                    <AlertTriangle size={16} />
                                    Substituir Tudo
                                </h4>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Apaga todos os dados atuais do banco e restaura exatamente o conteúdo deste arquivo.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleReplaceImport}
                                disabled={importing}
                                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-60"
                            >
                                {importing && <Loader2 size={13} className="animate-spin" />}
                                Substituir dados atuais
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setPendingImport(null)}
                            disabled={importing}
                            className="rounded-xl px-4 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Zona de Perigo / Redefinição do Banco */}
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                            <Trash2 size={18} />
                            Zona de Perigo: Redefinir Aplicação
                        </h2>
                        <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
                            Limpa todas as avaliações, lista de interesse e perfis para recomeçar o onboarding do zero.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setResetConfirmInput("");
                            setResetModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                    >
                        <Trash2 size={14} />
                        Redefinir banco
                    </button>
                </div>
            </div>

            {/* Modal de Edição de Perfil */}
            {editingUser && (
                <EditProfileModal
                    open={Boolean(editingUser)}
                    onClose={() => setEditingUser(null)}
                    user={editingUser}
                    onUpdated={(updated) => {
                        updateUser(updated);
                        setEditingUser(null);
                        setMessage({ kind: "success", text: `Perfil de ${updated.name} atualizado com sucesso.` });
                    }}
                />
            )}

            {/* Modal de Confirmação de Reset */}
            <Modal open={resetModalOpen} onClose={() => !resetting && setResetModalOpen(false)}>
                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                            <AlertTriangle size={20} />
                        </span>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Tem certeza absoluta?
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        Todos os perfis cadastrados, histórico de filmes, notas, resenhas e filmes na lista de interesse serão permanentemente excluídos. O app voltará à tela inicial de Onboarding.
                    </p>

                    <div className="mt-4 space-y-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Digite <strong className="font-bold text-red-600">REINICIAR</strong> para confirmar:
                        </label>
                        <input
                            type="text"
                            value={resetConfirmInput}
                            onChange={(e) => setResetConfirmInput(e.target.value)}
                            placeholder="REINICIAR"
                            className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setResetModalOpen(false)}
                            disabled={resetting}
                            className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleResetDatabase}
                            disabled={resetConfirmInput !== "REINICIAR" || resetting}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {resetting && <Loader2 size={13} className="animate-spin" />}
                            {resetting ? "Redefinindo..." : "Confirmar e Apagar Tudo"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
