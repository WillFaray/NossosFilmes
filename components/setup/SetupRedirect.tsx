"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface SetupRedirectProps {
    userCount: number;
    children: React.ReactNode;
}

/** Redireciona para /setup quando não há exatamente 2 usuários; volta para / quando o setup está completo */
export function SetupRedirect({ userCount, children }: SetupRedirectProps) {
    const pathname = usePathname();
    const router = useRouter();

    const needsSetup = userCount !== 2;

    useEffect(() => {
        if (needsSetup && pathname !== "/setup") {
            router.replace("/setup");
        } else if (!needsSetup && pathname === "/setup") {
            router.replace("/");
        }
    }, [needsSetup, pathname, router]);

    // Durante o setup (sem 2 usuários), não renderiza o AppShell
    if (needsSetup) {
        return <>{children}</>;
    }

    return <>{children}</>;
}