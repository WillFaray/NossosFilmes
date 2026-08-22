"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    DatabaseBackup,
    Download,
    FileJson,
    Loader2,
    Settings,
    Upload
} from "lucide-react";
import { backupDatabase, exportData, importData, type ExportData } from "@/lib/actions";

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

    const [exporting, setExporting] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [importing, setImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<{ data: ExportData; fileName: string } | null>(null);
    const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

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
            setMessage({ kind: "success", text: "Dados exportados com sucesso." });
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
            setMessage({ kind: "success", text: "Backup do banco gerado com sucesso." });
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
            // Validação básica no cliente antes de confirmar
            if (
                typeof parsed !== "object" ||
                parsed === null ||
                !Array.isArray((parsed as ExportData).users) ||
                !Array.isArray((parsed as ExportData).reviews)
            ) {
                throw new Error("formato inválido");
            }
            setPendingImport({ data: parsed as ExportData, fileName: file.name });
        } catch (error) {
            console.error("Arquivo de importação inválido:", error);
            setMessage({ kind: "error", text: "Arquivo inválido. Selecione um JSON exportado pelo NossosFilmes." });
        }
    };

    const handleConfirmImport = async () => {
        if (!pendingImport || importing) return;
        setImporting(true);
        setMessage(null);
        try {
            const result = await importData(pendingImport.data);
            setPendingImport(null);
            setMessage({
                kind: "success",
                text: `Importação concluída: ${result.users} usuários, ${result.reviews} registros e ${result.watchlist} filmes na lista.`
            });
            // Recarrega os dados server-side em todas as páginas
            router.refresh();
        } catch (error) {
            console.error("Erro ao importar dados:", error);
            setMessage({
                kind: "error",
                text: error instanceof Error ? error.message : "Não foi possível importar os dados."
            });
        } finally {
            setImporting(false);
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
                    Exporte, importe e faça backup dos seus dados.
                </p>
            </div>

            {/* Mensagem de feedback */}
            {message && (
                <div
                    role="status"
                    className={`rounded-xl p-4 text-sm ${message.kind === "success"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        }`}
                >
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Exportação JSON */}
                <section className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-card-dark dark:ring-gray-800">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <FileJson size={20} />
                    </span>
                    <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">Exportar dados</h2>
                    <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">
                        Baixa todos os registros, perfis e lista de interesse em um arquivo JSON.
                    </p>
                    <button
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
                    <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">Backup do banco</h2>
                    <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">
                        Gera uma cópia física do banco SQLite (.db), ideal para restauração completa.
                    </p>
                    <button
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
                    <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">Importar dados</h2>
                    <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">
                        Restaura um JSON exportado anteriormente.
                        <span className="mt-1 flex items-start gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            Substitui todos os dados atuais!
                        </span>
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {importing ? "Importando..." : "Selecionar arquivo"}
                    </button>
                </section>
            </div>

            {/* Confirmação de importação */}
            {pendingImport && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-500/40 dark:bg-amber-500/10">
                    <h3 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle size={18} />
                        Confirmar importação
                    </h3>
                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                        O arquivo <strong>{pendingImport.fileName}</strong> contém{" "}
                        {pendingImport.data.users.length} usuário(s), {pendingImport.data.reviews.length} registro(s)
                        e {pendingImport.data.watchlist.length} filme(s) na lista de interesse.
                        Todos os dados atuais serão <strong>substituídos</strong>. Deseja continuar?
                    </p>
                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={() => setPendingImport(null)}
                            disabled={importing}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmImport}
                            disabled={importing}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {importing && <Loader2 size={15} className="animate-spin" />}
                            {importing ? "Importando..." : "Substituir dados"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}