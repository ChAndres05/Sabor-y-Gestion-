import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL no está definida')
}

// 1. Tipamos el objeto global correctamente
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// 2. Reutilizamos el Pool o creamos uno nuevo
// Agregamos idleTimeoutMillis para liberar conexiones inactivas y no saturar Postgres
const pool = globalForPrisma.pool ?? new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000, // Cierra conexiones inactivas tras 30s
  connectionTimeoutMillis: 2000, // No esperes más de 2s para conectar
})

const adapter = new PrismaPg(pool)

// 3. Reutilizamos el cliente de Prisma
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter })

// 4. En desarrollo, guardamos AMBOS en el global
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}