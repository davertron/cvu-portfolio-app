import { PrismaClient } from '@prisma/client';

interface AppGlobal extends NodeJS.Global {
    db: PrismaClient
}

declare const global: AppGlobal;

const db = global.db || new PrismaClient();
if(process.env.NODE_ENV == 'development') global.db = db;

export default db;
