import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcryptjs from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { correo_electronico, codigo, nueva_contrasena } = await req.json();

        const user = await prisma.usuarios.findFirst({
            where: {
                correo_electronico: correo_electronico,
                codigo_recuperacion: codigo,
                expiracion_recuperacion: { gte: new Date() }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "INVALID_OR_EXPIRED_CODE" }, { status: 400 });
        }

        const nuevoHash = await bcryptjs.hash(nueva_contrasena, 10);

        await prisma.usuarios.update({
            where: { id_usuario: user.id_usuario },
            data: {
                contrasena_hash: nuevoHash,
                codigo_recuperacion: null,
                expiracion_recuperacion: null
            }
        });

        return NextResponse.json({ message: "PASSWORD_CHANGED" }, { status: 200 });
    } catch (error) {
        console.error("Error en reset-password:", error);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}