import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { pusherServer } from "../../../../lib/pusher";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id_zona_filtro = searchParams.get("id_zona");

        const mesas = await prisma.mesas.findMany({
            where: {
                id_zona: id_zona_filtro ? parseInt(id_zona_filtro) : undefined
            },
            include: { zona: true },
            orderBy: { numero: 'asc' },
        });
        return NextResponse.json(mesas);
    } catch (error) {
        console.error("Error al obtener mesas:", error);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { numero, capacidad, id_zona, estado, forma } = body;

        if (!numero || !capacidad) {
            return NextResponse.json({ error: "DATOS_INCOMPLETOS" }, { status: 400 });
        }

        const nuevaMesa = await prisma.mesas.create({
            data: {
                numero: Number(numero),
                capacidad: Number(capacidad),
                id_zona: id_zona ? Number(id_zona) : null,
                estado: estado || "LIBRE",
                forma: forma || "CUADRADA",
            },
        });

        await pusherServer.trigger('tables-channel', 'table-updated', nuevaMesa);

        return NextResponse.json(nuevaMesa, { status: 201 });
    } catch (error) {
        console.error("Error al crear mesa:", error);

        // Validación estricta de TypeScript para el error de Prisma (Código P2002: Duplicado)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ error: "EL_NUMERO_DE_MESA_YA_EXISTE" }, { status: 400 });
        }

        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}