import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // 4 niveles hacia atrás

export async function GET() {
    try {
        // Buscamos todos los pedidos que ya están en el historial (Pagados o Cancelados)
        const historialPedidos = await prisma.pedidos.findMany({
            where: {
                estado: {
                    in: ['PAGADO', 'CANCELADO'], // Filtramos solo el historial
                },
            },
            include: {
                // AQUÍ ESTABA EL ERROR: Es 'mesa' en singular, no 'mesas'
                mesa: {
                    select: {
                        numero: true,
                        id_zona: true,
                    }
                }
            },
            orderBy: {
                fecha_hora_pedido: 'desc', // Del más reciente al más antiguo
            },
        });

        return NextResponse.json(historialPedidos, { status: 200 });
    } catch (error) {
        console.error("Error al obtener el historial de pedidos:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al cargar el historial" },
            { status: 500 }
        );
    }
}