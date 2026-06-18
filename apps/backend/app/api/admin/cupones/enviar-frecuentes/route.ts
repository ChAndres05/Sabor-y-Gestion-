import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

interface ClientTarget {
    id: number;
    name: string;
    email: string | null;
    purchasesCount: number;
}

// GET: list all active clients with email, along with their paid purchases count
export async function GET() {
    try {
        const rolCliente = await prisma.roles.findFirst({
            where: {
                nombre: {
                    contains: 'CLIENTE',
                    mode: 'insensitive'
                }
            }
        });

        const users = await prisma.usuarios.findMany({
            where: {
                activo: true,
                correo_electronico: { not: null },
                id_rol: rolCliente ? rolCliente.id_rol : undefined,
            },
            select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                correo_electronico: true,
                _count: {
                    select: {
                        pedidos_pedidos_id_usuario_clienteTousuarios: {
                            where: { estado: 'PAGADO' }
                        }
                    }
                }
            }
        });

        const clients: ClientTarget[] = users.map(u => ({
            id: u.id_usuario,
            name: `${u.nombre} ${u.apellido || ''}`.trim(),
            email: u.correo_electronico,
            purchasesCount: u._count.pedidos_pedidos_id_usuario_clienteTousuarios
        }));

        return NextResponse.json(clients, { status: 200 });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}

// POST: send selected coupon to active clients via email
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id_cupon, destinatarios } = body;

        if (!id_cupon) {
            return NextResponse.json({ error: 'ID_CUPON_REQUERIDO' }, { status: 400 });
        }

        const coupon = await prisma.cupones.findUnique({
            where: { id_cupon: Number(id_cupon) }
        });

        if (!coupon) {
            return NextResponse.json({ error: 'CUPON_NO_ENCONTRADO' }, { status: 404 });
        }

        if (coupon.estado !== 'ACTIVO') {
            return NextResponse.json({ error: 'CUPON_INACTIVO' }, { status: 400 });
        }

        const rolCliente = await prisma.roles.findFirst({
            where: {
                nombre: {
                    contains: 'CLIENTE',
                    mode: 'insensitive'
                }
            }
        });

        const users = await prisma.usuarios.findMany({
            where: {
                activo: true,
                correo_electronico: { not: null },
                id_rol: rolCliente ? rolCliente.id_rol : undefined,
            },
            select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                correo_electronico: true,
                _count: {
                    select: {
                        pedidos_pedidos_id_usuario_clienteTousuarios: {
                            where: { estado: 'PAGADO' }
                        }
                    }
                }
            }
        });

        let targetUsers: ClientTarget[] = users.map(u => ({
            id: u.id_usuario,
            name: `${u.nombre} ${u.apellido || ''}`.trim(),
            email: u.correo_electronico,
            purchasesCount: u._count.pedidos_pedidos_id_usuario_clienteTousuarios
        }));

        if (destinatarios && Array.isArray(destinatarios)) {
            const idList = destinatarios.map(Number);
            targetUsers = targetUsers.filter(u => idList.includes(u.id));
        } else {
            // Default fallback: send to frequent clients (> 5 purchases)
            targetUsers = targetUsers.filter(u => u.purchasesCount > 5);
        }

        if (targetUsers.length === 0) {
            return NextResponse.json({ message: 'NO_USERS_FOUND', sentCount: 0 }, { status: 200 });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const emailPromises = targetUsers.map(async (user: ClientTarget) => {
            const formattedExpiration = coupon.fecha_expiracion.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const discountText = coupon.tipo_descuento === 'PERCENTAGE'
                ? `${coupon.valor_descuento}%`
                : `Bs. ${Number(coupon.valor_descuento).toFixed(2)}`;

            try {
                await transporter.sendMail({
                    from: '"Sabor y Gestión" <noreply@saborygestion.com>',
                    to: user.email!,
                    subject: "¡Regalo para nuestro cliente estrella! - Sabor y Gestión",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 15px; background-color: #ffffff;">
                            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px dashed #ea580c;">
                                <h1 style="color: #ea580c; margin: 0;">¡Gracias por ser un Cliente Estrella! ⭐</h1>
                                <p style="color: #6b7280; font-size: 16px;">En Sabor y Gestión valoramos tu preferencia. Has realizado <strong>${user.purchasesCount} compras</strong> con nosotros.</p>
                            </div>
                            
                            <div style="padding: 30px 20px; text-align: center;">
                                <p style="font-size: 16px; color: #374151;">Queremos regalarte un cupón especial para tu próxima visita:</p>
                                
                                <div style="background-color: #fff7ed; border: 2px dashed #ffedd5; padding: 25px; border-radius: 12px; margin: 20px 0; display: inline-block; width: 80%;">
                                    <span style="font-size: 14px; font-weight: bold; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">CUPÓN DE DESCUENTO</span>
                                    <span style="font-size: 40px; font-weight: 900; color: #ea580c; display: block; margin-bottom: 10px;">${discountText} OFF</span>
                                    
                                    <div style="background-color: #ffffff; padding: 12px 20px; border-radius: 8px; border: 1px solid #fed7aa; display: inline-block; font-family: monospace; font-size: 20px; font-weight: bold; color: #4b5563; letter-spacing: 2px;">
                                        ${coupon.codigo}
                                    </div>
                                    
                                    ${coupon.descripcion ? `<p style="font-size: 13px; color: #6b7280; margin: 15px 0 0 0; line-height: 1.4;">${coupon.descripcion}</p>` : ''}
                                </div>
                                
                                <p style="font-size: 13px; color: #9ca3af; margin-top: 10px;">
                                    * Válido para consumos mínimos de <strong>Bs. ${Number(coupon.monto_minimo_compra).toFixed(2)}</strong>.<br/>
                                    * Fecha de expiración: <strong>${formattedExpiration}</strong>.
                                </p>
                            </div>
                            
                            <div style="border-top: 1px solid #f3f4f6; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                                <p>Sabor y Gestión © 2026. Todos los derechos reservados.</p>
                            </div>
                        </div>
                    `
                });
                return { email: user.email, status: 'SUCCESS' };
            } catch (err) {
                console.error(`Error enviando correo a ${user.email}:`, err);
                return { email: user.email, status: 'FAILED' };
            }
        });

        const results = await Promise.all(emailPromises);
        const successCount = results.filter((r: { email: string | null; status: string }) => r.status === 'SUCCESS').length;

        return NextResponse.json({
            message: 'EMAILS_SENT',
            totalSent: successCount,
            details: results
        }, { status: 200 });

    } catch (error) {
        console.error('Error al enviar cupones por correo:', error);
        return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
    }
}
