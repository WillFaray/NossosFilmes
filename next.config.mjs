import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "image.tmdb.org"
            },
            {
                protocol: "https",
                hostname: "i.pravatar.cc"
            },
            {
                protocol: "https",
                hostname: "ui-avatars.com"
            }
        ]
    },
    // Pacotes com módulos nativos que não devem ser empacotados pelo webpack
    experimental: {
        serverComponentsExternalPackages: [
            "better-sqlite3",
            "@prisma/adapter-better-sqlite3",
            "@prisma/client"
        ]
    },
    webpack: (config) => {
        config.resolve.alias["@"] = __dirname;
        return config;
    }
};

export default nextConfig;