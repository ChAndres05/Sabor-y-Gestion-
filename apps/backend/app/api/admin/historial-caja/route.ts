import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Get unique cashiers from asignaciones_caja_turno
    const asignaciones = await prisma.asignaciones_caja_turno.findMany({
      distinct: ['id_usuario_cajero'],
      include: {
        usuarios: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    const cajeros = asignaciones
      .filter(a => a.usuarios)
      .map(a => ({
        id: a.usuarios.id_usuario,
        name: `${a.usuarios.nombre} ${a.usuarios.apellido || ''}`.trim()
      }));

    // 2. Get all payments (Ingresos) from pagos table
    const pagos = await prisma.pagos.findMany({
      include: {
        usuario_cajero: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true
          }
        },
        metodo_pago: {
          select: {
            nombre: true
          }
        },
        pedido: {
          include: {
            mesa: {
              select: {
                numero: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha_hora_pago: 'desc'
      }
    });

    // 3. Get all movements (could be Ingreso or Egreso) from movimientos_caja table
    const movimientos = await prisma.movimientos_caja.findMany({
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fecha_hora_movimiento: 'desc'
      }
    });

    // 4. Combine and format both into CashTransaction structure
    const mappedPagos = pagos.map(pago => {
      const paymentMethodName = pago.metodo_pago?.nombre?.toUpperCase() || '';
      const paymentMethod: 'Efectivo' | 'QR' = paymentMethodName.includes('QR') ? 'QR' : 'Efectivo';
      
      const mesaNum = pago.pedido?.mesa?.numero;
      const description = mesaNum ? `Pago Mesa ${mesaNum}` : `Pago Pedido #${pago.id_pedido}`;

      const cajeroName = pago.usuario_cajero 
        ? `${pago.usuario_cajero.nombre} ${pago.usuario_cajero.apellido || ''}`.trim()
        : 'Cajero';

      return {
        id: `p-${pago.id_pago}`,
        cajeroId: pago.id_usuario_cajero,
        cajeroName,
        date: pago.fecha_hora_pago.toISOString(),
        amount: Number(pago.monto_pagado),
        paymentMethod,
        type: 'Ingreso' as const,
        description,
        timestamp: pago.fecha_hora_pago.getTime()
      };
    });

    const mappedMovimientos = movimientos.map(mov => {
      const type = mov.tipo_movimiento.toUpperCase().includes('EGRESO') ? 'Egreso' : 'Ingreso';
      const cajeroName = mov.usuario
        ? `${mov.usuario.nombre} ${mov.usuario.apellido || ''}`.trim()
        : 'Cajero';

      return {
        id: `m-${mov.id_movimiento_caja}`,
        cajeroId: mov.id_usuario,
        cajeroName,
        date: mov.fecha_hora_movimiento.toISOString(),
        amount: Number(mov.monto),
        paymentMethod: 'Efectivo' as const,
        type,
        description: mov.descripcion || (type === 'Egreso' ? 'Egreso de caja' : 'Ingreso de caja'),
        timestamp: mov.fecha_hora_movimiento.getTime()
      };
    });

    // Combine and sort by timestamp desc
    const allTransactions = [...mappedPagos, ...mappedMovimientos]
      .sort((a, b) => b.timestamp - a.timestamp);

    // Re-map IDs to sequential integers to match the frontend CashTransaction interface
    const transactions = allTransactions.map((tx, idx) => ({
      id: idx + 1,
      cajeroId: tx.cajeroId,
      cajeroName: tx.cajeroName,
      date: tx.date,
      amount: tx.amount,
      paymentMethod: tx.paymentMethod,
      type: tx.type,
      description: tx.description
    }));

    return NextResponse.json({
      transactions,
      cajeros
    });

  } catch (error) {
    console.error('Error al obtener historial de caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener historial de caja' },
      { status: 500 }
    );
  }
}
