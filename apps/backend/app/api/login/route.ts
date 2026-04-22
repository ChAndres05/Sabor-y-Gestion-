import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from '../../../lib/prisma';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Extraemos "usuario" (o "correo_electronico" como respaldo)
    const usuario = body.usuario || body.correo_electronico;
    const contrasena = body.contrasena;

    if (!usuario || !contrasena) {
      return NextResponse.json(
        { error: "Usuario/correo y contraseña son obligatorios" },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { correo_electronico: usuario },
          { nombre_usuario: usuario },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { error: "Cuenta desactivada" },
        { status: 403, headers: corsHeaders }
      );
    }

    let validPassword = false;
    
    // Verificamos si la contraseña en la BD está encriptada con bcrypt (los hashes de bcrypt empiezan con $2)
    if (user.contrasena_hash && user.contrasena_hash.startsWith("$2")) {
      validPassword = await bcryptjs.compare(contrasena, user.contrasena_hash);
    } else {
      // Fallback para texto plano (útil si insertaste el usuario manualmente en la base de datos)
      validPassword = contrasena === user.contrasena_hash;
    }

    if (!validPassword) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      message: "Login exitoso",
      usuario: user,
    }, { headers: corsHeaders });
  } catch (error: unknown) {
    const mensajeError = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: mensajeError },
      { status: 500, headers: corsHeaders }
    );
  }
}