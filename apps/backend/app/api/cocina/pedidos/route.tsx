import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Cargamos pedidos que tienen una asignación activa de cocina (estado != CANCELADO/COMPLETADO)
        const asignaciones = await prisma.asignaciones_cocina_pedido.findMany({
            where: {
                estado_asignacion: {
                    notIn: ['CANCELADO', 'COMPLETADO']
                },
                pedido: {
                    estado: {
                        notIn: ['CANCELADO', 'PAGADO', 'ENTREGADO']
                    }
                }
            },
            include: {
                pedido: {
                    include: {
                        mesa: true,
                        detalles_pedido: {
                            include: {
                                presentacion_producto: {
                                    include: {
                                        producto: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                fecha_hora_asignacion: 'asc'
            }
        });

        // Mapeamos para devolver solo el pedido con datos de cocina
        const pedidosCocina = asignaciones.map(a => ({
            ...a.pedido,
            id_asignacion: a.id_asignacion_cocina_pedido,
            estado_asignacion: a.estado_asignacion,
            fecha_pedido: a.pedido.fecha_hora_pedido,
        }));

        return NextResponse.json(pedidosCocina);
    } catch (error) {
        console.error("Error al obtener pedidos para cocina:", error);
        return NextResponse.json({ error: 'Error interno al cargar los pedidos' }, { status: 500 });
    }
}