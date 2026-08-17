import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=4338ca&color=fff&size=150&bold=true";

async function main() {
    // Usuários iniciais do app (Ana e Bruno)
    const ana = await prisma.user.upsert({
        where: { id: "user-1" },
        update: {},
        create: {
            id: "user-1",
            name: "Ana Souza",
            avatarUrl: DEFAULT_AVATAR
        }
    });

    const bruno = await prisma.user.upsert({
        where: { id: "user-2" },
        update: {},
        create: {
            id: "user-2",
            name: "Bruno Lima",
            avatarUrl: DEFAULT_AVATAR
        }
    });

    console.log("Seed concluído:", ana.name, "e", bruno.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });