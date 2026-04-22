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

    const {
      usuario_ci,
      nombre,
      apellido,
      nombre_usuario,
      telefono,
      correo_electronico,
      contrasena,
    } = body;

    // Validar campos vacíos
    if (
      !nombre ||
      !apellido ||
      !nombre_usuario ||
      !correo_electronico ||
      !contrasena
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar si ya existe usuario con este email o nombre de usuario
    const existeUsuario = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { correo_electronico },
          { nombre_usuario },
        ],
      },
    });

    if (existeUsuario) {
      return NextResponse.json(
        { error: "Usuario o correo ya registrado" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Encriptar contraseña
    const hash = await bcryptjs.hash(contrasena, 10);

    // Insertar usuario
    const usuario = await prisma.usuarios.create({
      data: {
        id_rol: 6,
        usuario_ci: parseInt(usuario_ci, 10), // Convertimos el string a entero
        nombre,
        apellido,
        nombre_usuario,
        telefono,
        correo_electronico,
        contrasena_hash: hash,
        activo: true,
      },
    });

    return NextResponse.json({
      message: "Registro exitoso",
      usuario,
    }, { headers: corsHeaders });
  } catch (error: unknown) {
    const mensajeError = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: mensajeError },
      { status: 500, headers: corsHeaders }
    );
  }
}