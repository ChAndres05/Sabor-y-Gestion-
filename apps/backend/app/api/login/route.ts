import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Mapeo de Roles actualizado: CLIENTE ahora es 5
const ROLES_MAP: Record<number, string> = {
  1: "ADMIN",
  2: "MESERO",
  3: "COCINERO",
  4: "CAJERO",
  5: "CLIENTE",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const usuario = body.usuario || body.correo_electronico;
    const contrasena = body.contrasena;

    if (!usuario || !contrasena) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
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
        { error: "INVALID_CREDENTIALS" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { error: "ACCOUNT_DISABLED" },
        { status: 403, headers: corsHeaders }
      );
    }

    let validPassword = false;

    if (user.contrasena_hash && user.contrasena_hash.startsWith("$2")) {
      validPassword = await bcryptjs.compare(contrasena, user.contrasena_hash);
    } else {
      validPassword = contrasena === user.contrasena_hash;
    }

    if (!validPassword) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = jwt.sign(
      { id: user.id_usuario, rol: ROLES_MAP[user.id_rol] || "CLIENTE" },
      process.env.JWT_SECRET || "clave_secreta_temporal",
      { expiresIn: "8h" }
    );

    const userData = {
      id: user.id_usuario,
      rol: ROLES_MAP[user.id_rol] || "CLIENTE",
      activo: user.activo,
      nombre: user.nombre,
      apellido: user.apellido,
      username: user.nombre_usuario,
      correo: user.correo_electronico,
      telefono: user.telefono,
      ci: user.usuario_ci
    };

    return NextResponse.json({
      message: "Login exitoso",
      accessToken: token,
      user: userData,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Error en login:", error);
    const mensajeError = error instanceof Error ? error.message : "SERVER_ERROR";
    return NextResponse.json(
      { error: mensajeError },
      { status: 500, headers: corsHeaders }
    );
  }
}