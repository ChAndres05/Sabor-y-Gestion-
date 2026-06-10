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

// PUT: Update an existing coupon
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const idCupon = parseInt(id);
        const body = await req.json();

        const { code, discountType, discountValue, minPurchase, expirationDate, usageLimit, description, status } = body;

        const existing = await prisma.cupones.findUnique({
            where: { id_cupon: idCupon }
        });

        if (!existing) {
            return NextResponse.json({ error: 'CUPON_NO_ENCONTRADO' }, { status: 404 });
        }

        const updateData: any = {};

        if (code !== undefined) {
            const codigoNormalizado = code.toUpperCase().replace(/\s+/g, '');
            // Check if code is already taken by another coupon
            const codeCheck = await prisma.cupones.findFirst({
                where: {
                    codigo: codigoNormalizado,
                    NOT: { id_cupon: idCupon }
                }
            });
            if (codeCheck) {
                return NextResponse.json({ error: 'CODIGO_DUPLICADO' }, { status: 400 });
            }
            updateData.codigo = codigoNormalizado;
        }

        if (discountType !== undefined) {
            updateData.tipo_descuento = discountType === 'percentage' ? 'PERCENTAGE' : 'FIXED';
        }

        if (discountValue !== undefined) {
            updateData.valor_descuento = Number(discountValue);
        }

        if (minPurchase !== undefined) {
            updateData.monto_minimo_compra = Number(minPurchase);
        }

        if (expirationDate !== undefined) {
            updateData.fecha_expiracion = new Date(`${expirationDate}T23:59:59.000Z`);
        }

        if (usageLimit !== undefined) {
            updateData.limite_uso = usageLimit ? Number(usageLimit) : null;
        }

        if (description !== undefined) {
            updateData.descripcion = description || null;
        }

        if (status !== undefined) {
            updateData.estado = status === 'active' ? 'ACTIVO' : (status === 'inactive' ? 'INACTIVO' : 'EXPIRADO');
        } else if (expirationDate !== undefined) {
            // Recalculate status based on new expiration date
            const expDate = updateData.fecha_expiracion;
            const today = nowBolivia();
            if (expDate < today) {
                updateData.estado = 'EXPIRADO';
            } else if (existing.estado === 'EXPIRADO') {
                updateData.estado = 'ACTIVO';
            }
        }

        const updated = await prisma.cupones.update({
            where: { id_cupon: idCupon },
            data: updateData
        });

        return NextResponse.json(mapCupon(updated), { status: 200 });
    } catch (error) {
        console.error('Error al actualizar cupón:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}

// DELETE: Remove a coupon
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const idCupon = parseInt(id);

        const existing = await prisma.cupones.findUnique({
            where: { id_cupon: idCupon }
        });

        if (!existing) {
            return NextResponse.json({ error: 'CUPON_NO_ENCONTRADO' }, { status: 404 });
        }

        // Delete the coupon physically from database
        await prisma.cupones.delete({
            where: { id_cupon: idCupon }
        });

        return NextResponse.json({ message: 'CUPON_ELIMINADO' }, { status: 200 });
    } catch (error) {
        console.error('Error al eliminar cupón:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}
