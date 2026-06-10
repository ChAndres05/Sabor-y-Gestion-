import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1 sola Caja por ahora, tal como pediste
    const caja1 = await prisma.cajas.upsert({
      where: { nombre: 'Caja Principal' },
      update: {},
      create: { nombre: 'Caja Principal', activa: true }
    });

    // Turnos
    const t1_inicio = new Date('1970-01-01T08:00:00.000Z');
    const t1_fin = new Date('1970-01-01T13:00:00.000Z');
    const turno1 = await prisma.turnos.upsert({
      where: { nombre: 'Mañana' },
      update: { hora_inicio: t1_inicio, hora_fin: t1_fin },
      create: { nombre: 'Mañana', hora_inicio: t1_inicio, hora_fin: t1_fin, activo: true }
    });

    const t2_inicio = new Date('1970-01-01T13:00:00.000Z');
    const t2_fin = new Date('1970-01-01T18:00:00.000Z');
    const turno2 = await prisma.turnos.upsert({
      where: { nombre: 'Tarde' },
      update: { hora_inicio: t2_inicio, hora_fin: t2_fin },
      create: { nombre: 'Tarde', hora_inicio: t2_inicio, hora_fin: t2_fin, activo: true }
    });

    const t3_inicio = new Date('1970-01-01T18:00:00.000Z');
    const t3_fin = new Date('1970-01-01T23:00:00.000Z');
    const turno3 = await prisma.turnos.upsert({
      where: { nombre: 'Noche' },
      update: { hora_inicio: t3_inicio, hora_fin: t3_fin },
      create: { nombre: 'Noche', hora_inicio: t3_inicio, hora_fin: t3_fin, activo: true }
    });

    return NextResponse.json({ 
      message: 'Seed completado exitosamente',
      cajas: [caja1],
      turnos: [turno1, turno2, turno3]
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al hacer seed' }, { status: 500 });
  }
}
