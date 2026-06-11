import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowBolivia } from '@/lib/timezone';

// GET: Validate a coupon by code and subtotal
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const codigo = searchParams.get('codigo')?.toUpperCase().replace(/\s+/g, '');
        const montoStr = searchParams.get('monto');

        if (!codigo) {
            return NextResponse.json({ valido: false, error: 'CÓDIGO_REQUERIDO' }, { status: 400 });
        }

        const monto = montoStr ? Number(montoStr) : 0;

        const cupon = await prisma.cupones.findUnique({
            where: { codigo }
        });

        if (!cupon) {
            return NextResponse.json({ valido: false, error: 'El cupón ingresado no existe.' }, { status: 404 });
        }

        const today = nowBolivia();

        // Check expiration date
        if (cupon.fecha_expiracion < today || cupon.estado === 'EXPIRADO') {
            if (cupon.estado !== 'EXPIRADO') {
                await prisma.cupones.update({
                    where: { id_cupon: cupon.id_cupon },
                    data: { estado: 'EXPIRADO' }
                });
            }
            return NextResponse.json({ valido: false, error: 'El cupón ya ha expirado.' }, { status: 400 });
        }

        // Check active state
        if (cupon.estado === 'INACTIVO') {
            return NextResponse.json({ valido: false, error: 'El cupón está pausado o deshabilitado.' }, { status: 400 });
        }

        // Check usage limit
        if (cupon.limite_uso !== null && cupon.contador_uso >= cupon.limite_uso) {
            return NextResponse.json({ valido: false, error: 'El cupón ha alcanzado el límite máximo de usos.' }, { status: 400 });
        }

        // Check minimum purchase
        if (monto < Number(cupon.monto_minimo_compra)) {
            return NextResponse.json({ 
                valido: false, 
                error: `El monto de compra no cumple con el mínimo requerido de Bs. ${Number(cupon.monto_minimo_compra).toFixed(2)}.` 
            }, { status: 400 });
        }

        return NextResponse.json({
            valido: true,
            cupon: {
                id: cupon.id_cupon.toString(),
                code: cupon.codigo,
                discountType: cupon.tipo_descuento === 'PERCENTAGE' ? 'percentage' : 'fixed',
                discountValue: Number(cupon.valor_descuento),
                minPurchase: Number(cupon.monto_minimo_compra),
                description: cupon.descripcion || ''
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Error al validar cupón:', error);
        return NextResponse.json({ valido: false, error: 'Error interno del servidor al validar el cupón.' }, { status: 500 });
    }
}
