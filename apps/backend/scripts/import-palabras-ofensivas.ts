import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL no esta definida');
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

const run = async () => {
    const filePath = path.resolve(__dirname, '..', '..', '..', 'palabras.txt');
    const raw = fs.readFileSync(filePath, 'utf8');
    const words = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (words.length === 0) {
        console.log('No se encontraron palabras para importar.');
        return;
    }

    const unique = Array.from(new Set(words));

    const result = await prisma.palabras_ofensivas.createMany({
        data: unique.map((palabra) => ({ palabra })),
        skipDuplicates: true,
    });

    console.log(`Insertadas: ${result.count} (de ${unique.length} palabras).`);
};

run()
    .catch((error) => {
        console.error('Error al importar palabras:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
