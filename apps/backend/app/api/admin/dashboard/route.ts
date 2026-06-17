import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowBolivia } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'hoy';
    const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD
    const endDateParam = searchParams.get('endDate'); // YYYY-MM-DD

    const currentLocal = nowBolivia();

    let startDate: Date;
    let endDate: Date;
    let compStartDate: Date;
    let compEndDate: Date;

    if (type === 'hoy') {
      startDate = new Date(Date.UTC(
        currentLocal.getUTCFullYear(),
        currentLocal.getUTCMonth(),
        currentLocal.getUTCDate(),
        0, 0, 0, 0
      ));
      endDate = new Date(Date.UTC(
        currentLocal.getUTCFullYear(),
        currentLocal.getUTCMonth(),
        currentLocal.getUTCDate(),
        23, 59, 59, 999
      ));

      // Comparison is yesterday
      compStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
      compEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (type === 'mes') {
      startDate = new Date(Date.UTC(
        currentLocal.getUTCFullYear(),
        currentLocal.getUTCMonth(),
        1,
        0, 0, 0, 0
      ));
      // End day of current month
      endDate = new Date(Date.UTC(
        currentLocal.getUTCFullYear(),
        currentLocal.getUTCMonth() + 1,
        0,
        23, 59, 59, 999
      ));

      // Comparison is previous month
      compStartDate = new Date(Date.UTC(
        currentLocal.getUTCFullYear(),
        currentLocal.getUTCMonth() - 1,
        1,
        0, 0, 0, 0
      ));
      compEndDate = new Date(Date.UTC(
        currentLocal.getUTCFullYear(),
        currentLocal.getUTCMonth(),
        0,
        23, 59, 59, 999
      ));
    } else {
      // type === 'rango'
      if (!startDateParam || !endDateParam) {
        return NextResponse.json({ error: 'Faltan parámetros startDate y endDate para búsqueda por rango.' }, { status: 400 });
      }
      startDate = new Date(startDateParam + 'T00:00:00.000Z');
      endDate = new Date(endDateParam + 'T23:59:59.999Z');

      const diffMs = endDate.getTime() - startDate.getTime();
      compStartDate = new Date(startDate.getTime() - diffMs - 1);
      compEndDate = new Date(startDate.getTime() - 1);
    }

    // 1. Ventas Netas (sum of total of orders in status 'PAGADO')
    const currentSalesResult = await prisma.pedidos.aggregate({
      _sum: { total: true },
      where: {
        estado: 'PAGADO',
        fecha_hora_pedido: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    const currentSales = Number(currentSalesResult._sum.total || 0);

    const prevSalesResult = await prisma.pedidos.aggregate({
      _sum: { total: true },
      where: {
        estado: 'PAGADO',
        fecha_hora_pedido: {
          gte: compStartDate,
          lte: compEndDate,
        },
      },
    });
    const prevSales = Number(prevSalesResult._sum.total || 0);

    let percentageStr = '+0%';
    if (prevSales === 0) {
      if (currentSales > 0) {
        percentageStr = '+100%';
      } else {
        percentageStr = '+0%';
      }
    } else {
      const pctChange = ((currentSales - prevSales) / prevSales) * 100;
      const sign = pctChange >= 0 ? '+' : '';
      percentageStr = `${sign}${pctChange.toFixed(0)}%`;
    }

    const ventasFormatted = `$${currentSales.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    // 2. Platos Más Vendidos (Top 3)
    const platosVendidos = await prisma.detalles_pedido.groupBy({
      by: ['id_presentacion_producto'],
      where: {
        pedido: {
          estado: 'PAGADO',
          fecha_hora_pedido: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: { cantidad: true },
    });

    const presentationIds = platosVendidos.map((p) => p.id_presentacion_producto);
    const presentations = await prisma.presentaciones_producto.findMany({
      where: { id_presentacion_producto: { in: presentationIds } },
      include: { producto: true },
    });

    const productSalesMap: Record<string, number> = {};
    for (const item of platosVendidos) {
      const pres = presentations.find((p) => p.id_presentacion_producto === item.id_presentacion_producto);
      if (pres && pres.producto) {
        const prodName = pres.producto.nombre;
        const qty = Number(item._sum.cantidad || 0);
        productSalesMap[prodName] = (productSalesMap[prodName] || 0) + qty;
      }
    }

    const topProducts = Object.entries(productSalesMap)
      .map(([nombre, u]) => ({ nombre, u }))
      .sort((a, b) => b.u - a.u)
      .slice(0, 3);

    const maxQty = topProducts[0]?.u || 0;
    const platos = topProducts.map((p) => ({
      nombre: p.nombre,
      u: p.u,
      pct: maxQty > 0 ? `${Math.round((p.u / maxQty) * 100)}%` : '0%',
    }));

    // 3. Horas Pico de Ventas (10AM to 4PM, indexes 0 to 6)
    const pedidosPeriodo = await prisma.pedidos.findMany({
      where: {
        estado: 'PAGADO',
        fecha_hora_pedido: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        fecha_hora_pedido: true,
        total: true,
      },
    });

    const hourlySales = [0, 0, 0, 0, 0, 0, 0];
    for (const p of pedidosPeriodo) {
      const hour = p.fecha_hora_pedido.getUTCHours();
      if (hour >= 10 && hour <= 16) {
        hourlySales[hour - 10] += Number(p.total);
      }
    }

    let maxHourSales = 0;
    let picoIndex = 3; // Default to 1PM (index 3)
    for (let i = 0; i < hourlySales.length; i++) {
      if (hourlySales[i] > maxHourSales) {
        maxHourSales = hourlySales[i];
        picoIndex = i;
      }
    }

    const hourLabels = ['10 AM', '11 AM', '12 PM', '01 PM', '02 PM', '03 PM', '04 PM'];
    const pico = hourLabels[picoIndex];

    const barras = hourlySales.map((sales) => {
      if (maxHourSales === 0) return '10%'; // Minimum visible bar height
      const pct = Math.max(10, Math.round((sales / maxHourSales) * 100));
      return `${pct}%`;
    });

    const horas = {
      pico,
      picoIndex,
      barras,
    };

    // 4. Mejores Clientes (Top 3) - Only clients with role "CLIENTE"
    const rolCliente = await prisma.roles.findFirst({
      where: {
        nombre: {
          contains: 'CLIENTE',
          mode: 'insensitive',
        },
      },
    });

    const clientSales = await prisma.pedidos.groupBy({
      by: ['id_usuario_cliente'],
      where: {
        estado: 'PAGADO',
        fecha_hora_pedido: {
          gte: startDate,
          lte: endDate,
        },
        id_usuario_cliente: {
          not: null,
        },
      },
      _sum: {
        total: true,
      },
      _count: {
        id_pedido: true,
      },
    });

    const userIds = clientSales
      .map((c) => c.id_usuario_cliente)
      .filter((id): id is number => id !== null);

    const users = await prisma.usuarios.findMany({
      where: {
        id_usuario: { in: userIds },
        id_rol: rolCliente ? rolCliente.id_rol : undefined,
      },
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
      },
    });

    const topClients = clientSales
      .map((cs) => {
        const user = users.find((u) => u.id_usuario === cs.id_usuario_cliente);
        if (!user) return null;
        const fullName = `${user.nombre} ${user.apellido || ''}`.trim();
        return {
          nombre: fullName,
          consumoVal: Number(cs._sum.total || 0),
          pedidos: cs._count.id_pedido,
        };
      })
      .filter((c): c is { nombre: string; consumoVal: number; pedidos: number } => c !== null)
      .sort((a, b) => b.consumoVal - a.consumoVal)
      .slice(0, 3);

    const clientes = topClients.map((c) => ({
      nombre: c.nombre,
      consumo: `$${c.consumoVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      pedidos: c.pedidos,
    }));

    return NextResponse.json({
      ventas: ventasFormatted,
      porcentaje: percentageStr,
      platos,
      horas,
      clientes,
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener datos del dashboard' },
      { status: 500 }
    );
  }
}
