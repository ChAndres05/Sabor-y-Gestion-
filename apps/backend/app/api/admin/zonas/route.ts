import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { pusherServer } from '../../../../lib/pusher';

// GET: Listar todas las zonas (Azotea, Terraza, etc.)
export async function GET() {
    try {
        const zonas = await prisma.zonas.findMany({
            orderBy: { id_zona: 'asc' },
        });
        return NextResponse.json(zonas, { status: 200 });
    } catch (error) {
        console.error('Error al obtener zonas:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}

// POST: Crear una nueva zona
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, descripcion } = body;

        if (!nombre) {
            return NextResponse.json({ error: 'EL_NOMBRE_ES_OBLIGATORIO' }, { status: 400 });
        }

        const nuevaZona = await prisma.zonas.create({
            data: { nombre, descripcion },
        });

        await pusherServer.trigger('tables-channel', 'zone-updated', nuevaZona);

        return NextResponse.json(nuevaZona, { status: 201 });
    } catch (error: unknown) {
        console.error('Error al crear zona:', error);
        const err = error as { code?: string };
        if (err?.code === 'P2002') {
            return NextResponse.json({ error: 'LA_ZONA_YA_EXISTE' }, { status: 400 });
        }
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}