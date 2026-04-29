import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
    try {
        const { correo_electronico } = await req.json();

        const usuario = await prisma.usuarios.findUnique({
            where: { correo_electronico }
        });

        if (!usuario) {
            return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 15 * 60000);

        await prisma.usuarios.update({
            where: { correo_electronico },
            data: {
                codigo_recuperacion: codigo,
                expiracion_recuperacion: expiracion
            }
        });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: '"Sabor y Gestión" <noreply@tusistema.com>',
            to: correo_electronico,
            subject: "Código de recuperación de contraseña",
            text: `Tu código es: ${codigo}. Expira en 15 minutos.`,
        });

        return NextResponse.json({ message: "CODE_SENT" }, { status: 200 });
    } catch (error) {
        console.error("Error en forgot-password:", error);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}