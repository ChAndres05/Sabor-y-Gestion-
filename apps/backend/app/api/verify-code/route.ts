import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
    try {
        const { correo_electronico, codigo } = await req.json();

        // Buscamos si existe un usuario que coincida con el correo, el código, 
        // y verificamos que el tiempo de expiración sea mayor o igual (gte) a la hora actual.
        const user = await prisma.usuarios.findFirst({
            where: {
                correo_electronico: correo_electronico,
                codigo_recuperacion: codigo,
                expiracion_recuperacion: { gte: new Date() }
            }
        });

        // Si no hay usuario, significa que el código es incorrecto o ya pasaron los 15 minutos
        if (!user) {
            return NextResponse.json(
                { error: "El código es incorrecto o ha expirado" },
                { status: 400 }
            );
        }

        // Si pasa la validación, le respondemos al frontend que todo está bien (Status 200)
        // No borramos el código de la BD todavía, eso se hace en el reset-password
        return NextResponse.json({ message: "CODE_VALID" }, { status: 200 });

    } catch (error) {
        console.error("Error en verify-code:", error);
        return NextResponse.json(
            { error: "SERVER_ERROR" },
            { status: 500 }
        );
    }
}