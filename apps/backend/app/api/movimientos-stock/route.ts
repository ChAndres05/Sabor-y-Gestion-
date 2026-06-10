import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ComputedMovimiento {
  id_movimiento: string;
  id_insumo: string;
  nombre_insumo: string;
  tipo_movimiento: string;
  cantidad: number;
  unidad_medida: string;
  stock_anterior: number;
  stock_actual: number;
  fecha_hora: string;
  usuario: string;
}

export async function GET() {
  try {
    // 1. Obtener todos los movimientos y sus insumos y usuarios asociados
    const movimientos = await prisma.movimientos_stock.findMany({
      include: {
        insumo: true,
        usuario: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fecha_registro: 'desc'
      }
    });

    // 2. Agrupar movimientos por insumo para calcular el historial de stock
    const movsPorInsumo: Record<number, typeof movimientos> = {};
    for (const mov of movimientos) {
      if (!movsPorInsumo[mov.id_insumo]) {
        movsPorInsumo[mov.id_insumo] = [];
      }
      movsPorInsumo[mov.id_insumo].push(mov);
    }

    const computedMovs: ComputedMovimiento[] = [];

    // 3. Para cada insumo, hacer el backtracking matemático del stock
    for (const idInsumoStr of Object.keys(movsPorInsumo)) {
      const idInsumo = Number(idInsumoStr);
      const mList = movsPorInsumo[idInsumo]; // Ya viene ordenado descendente por fecha_registro (de más nuevo a más viejo)

      // Obtener el stock actual del insumo en la base de datos
      const insumo = mList[0]?.insumo;
      if (!insumo) continue;

      let runningStock = Number(insumo.stock_actual);

      for (const mov of mList) {
        const cant = Number(mov.cantidad);
        const actual = runningStock;
        let anterior = runningStock;

        if (mov.tipo_movimiento === 'ENTRADA' || mov.tipo_movimiento === 'AJUSTE_POSITIVO') {
          anterior = runningStock - cant;
        } else if (mov.tipo_movimiento === 'SALIDA' || mov.tipo_movimiento === 'MERMA' || mov.tipo_movimiento === 'AJUSTE_NEGATIVO') {
          anterior = runningStock + cant;
        }

        // Actualizar el stock del paso anterior
        runningStock = anterior;

        computedMovs.push({
          id_movimiento: String(mov.id_movimiento_stock),
          id_insumo: String(mov.id_insumo),
          nombre_insumo: insumo.nombre,
          tipo_movimiento: mov.tipo_movimiento,
          cantidad: cant,
          unidad_medida: insumo.unidad_medida,
          stock_anterior: Number(anterior.toFixed(2)),
          stock_actual: Number(actual.toFixed(2)),
          fecha_hora: mov.fecha_registro.toISOString(),
          usuario: mov.usuario ? `${mov.usuario.nombre} ${mov.usuario.apellido || ''}`.trim() : (mov.motivo || 'Sistema')
        });
      }
    }

    // Ordenar de nuevo por fecha descendente global
    computedMovs.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

    return NextResponse.json(computedMovs);
  } catch (error) {
    console.error('Error al obtener movimientos de stock:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos de stock' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_insumo, tipo_movimiento, cantidad, motivo, id_usuario } = body;

    if (!id_insumo || !tipo_movimiento || cantidad === undefined || cantidad <= 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios o inválidos' }, { status: 400 });
    }

    const insumoId = Number(id_insumo);
    const cant = Number(cantidad);

    const resultado = await prisma.$transaction(async (tx) => {
      // Obtener el insumo actual
      const insumo = await tx.insumos.findUnique({
        where: { id_insumo: insumoId }
      });

      if (!insumo) {
        throw new Error('INSUMO_NO_ENCONTRADO');
      }

      let nuevoStock = Number(insumo.stock_actual);
      if (tipo_movimiento === 'ENTRADA' || tipo_movimiento === 'AJUSTE_POSITIVO') {
        nuevoStock += cant;
      } else if (tipo_movimiento === 'SALIDA' || tipo_movimiento === 'MERMA' || tipo_movimiento === 'AJUSTE_NEGATIVO') {
        nuevoStock -= cant;
      }

      if (nuevoStock < 0) {
        throw new Error('STOCK_INSUFICIENTE');
      }

      // Actualizar stock del insumo
      await tx.insumos.update({
        where: { id_insumo: insumoId },
        data: { stock_actual: nuevoStock }
      });

      // Crear el movimiento
      const mov = await tx.movimientos_stock.create({
        data: {
          id_insumo: insumoId,
          tipo_movimiento,
          cantidad: cant,
          motivo: motivo || null,
          id_usuario: id_usuario ? Number(id_usuario) : null,
          fecha_registro: new Date()
        }
      });

      return mov;
    });

    return NextResponse.json({ success: true, movimiento: resultado });
  } catch (error) {
    console.error('Error al registrar movimiento de stock:', error);
    const message = error instanceof Error ? error.message : '';
    if (message === 'INSUMO_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'Insumo no encontrado' }, { status: 404 });
    }
    if (message === 'STOCK_INSUFICIENTE') {
      return NextResponse.json({ error: 'Stock insuficiente para realizar esta salida' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al registrar movimiento' }, { status: 500 });
  }
}
