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
            }
        ]
    },
    webpack: (config) => {
        config.resolve.alias["@"] = __dirname;
        return config;
    }
};

export default nextConfig;