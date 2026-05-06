import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Buscamos solo los pedidos que importan a la cocina
        const pedidosCocina = await prisma.pedidos.findMany({
            where: {
                estado: {
                    in: ['REGISTRADO', 'EN_PREPARACION']
                }
            },
            // Hacemos los includes exactos que tu frontend espera leer
            include: {
                detalles_pedido: {
                    include: {
                        presentacion_producto: {
                            include: {
                                producto: true
                            }
                        }
                    }
                }
            },
            // Ordenamos por los más antiguos primero
            orderBy: {
                fecha_hora_pedido: 'asc'
            }
        });

        return NextResponse.json(pedidosCocina);
    } catch (error) {
        console.error("Error al obtener pedidos para cocina:", error);
        return NextResponse.json({ error: 'Error interno al cargar los pedidos' }, { status: 500 });
    }
}