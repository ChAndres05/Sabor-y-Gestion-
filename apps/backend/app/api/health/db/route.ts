import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      ok: true,
      message: 'Prisma conectado correctamente'
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Error de conexión con Prisma',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}