import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowBolivia } from '@/lib/timezone';

// Function to map DB model to Frontend expected interface
function mapCupon(cupon: any) {
    return {
        id: cupon.id_cupon.toString(),
        code: cupon.codigo,
        discountType: cupon.tipo_descuento === 'PERCENTAGE' ? 'percentage' : 'fixed',
        discountValue: Number(cupon.valor_descuento),
        minPurchase: Number(cupon.monto_minimo_compra),
        expirationDate: cupon.fecha_expiracion.toISOString().split('T')[0],
        status: cupon.estado === 'ACTIVO' ? 'active' : (cupon.estado === 'INACTIVO' ? 'inactive' : 'expired'),
        usageLimit: cupon.limite_uso,
        usageCount: cupon.contador_uso,
        description: cupon.descripcion || ''
    };
}

// GET: List all coupons
export async function GET() {
    try {
        const today = nowBolivia();

        // Automatically expire active coupons whose expiration date is in the past
        await prisma.cupones.updateMany({
            where: {
                estado: 'ACTIVO',
                fecha_expiracion: {
                    lt: today
                }
            },
            data: {
                estado: 'EXPIRADO'
            }
        });

        const cuponesDb = await prisma.cupones.findMany({
            orderBy: { fecha_creacion: 'desc' }
        });

        const mapped = cuponesDb.map(mapCupon);
        return NextResponse.json(mapped, { status: 200 });
    } catch (error) {
        console.error('Error al obtener cupones:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}

// POST: Create a new coupon
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, discountType, discountValue, minPurchase, expirationDate, usageLimit, description } = body;

        if (!code || !discountType || discountValue === undefined) {
            return NextResponse.json({ error: 'DATOS_INCOMPLETOS' }, { status: 400 });
        }

        const codigoNormalizado = code.toUpperCase().replace(/\s+/g, '');

        // Check if coupon code already exists
        const cuponExistente = await prisma.cupones.findUnique({
            where: { codigo: codigoNormalizado }
        });

        if (cuponExistente) {
            return NextResponse.json({ error: 'CODIGO_DUPLICADO' }, { status: 400 });
        }

        // Set expiration time to 23:59:59 of that day
        const expDate = new Date(`${expirationDate}T23:59:59.000Z`);

        // Check if expiration is in the past relative to now in Bolivia
        const today = nowBolivia();
        const estadoInicial = expDate < today ? 'EXPIRADO' : 'ACTIVO';

        const nuevoCupon = await prisma.cupones.create({
            data: {
                codigo: codigoNormalizado,
                tipo_descuento: discountType === 'percentage' ? 'PERCENTAGE' : 'FIXED',
                valor_descuento: Number(discountValue),
                monto_minimo_compra: Number(minPurchase || 0),
                fecha_expiracion: expDate,
                estado: estadoInicial,
                limite_uso: usageLimit ? Number(usageLimit) : null,
                descripcion: description || null,
                fecha_creacion: today
            }
        });

        return NextResponse.json(mapCupon(nuevoCupon), { status: 201 });
    } catch (error) {
        console.error('Error al crear cupón:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}
