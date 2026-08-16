"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { HeaderMobile } from "./HeaderMobile";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="lg:pl-64">
                <HeaderMobile onOpenSidebar={() => setSidebarOpen(true)} />
                <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}