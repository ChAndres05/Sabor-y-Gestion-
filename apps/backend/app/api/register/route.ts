import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Mapeo de Roles para normalizar la respuesta al frontend
const ROLES_MAP: Record<number, string> = {
  1: "ADMIN",
  2: "MESERO",
  3: "COCINERO",
  4: "CAJERO",
  6: "CLIENTE",
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

    // 1. Validar campos obligatorios con código de error estandarizado
    if (
      !nombre ||
      !apellido ||
      !nombre_usuario ||
      !correo_electronico ||
      !contrasena
    ) {
      return NextResponse.json(
        { error: "MISSING_FIELDS" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Verificar duplicados
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
        { error: "USER_ALREADY_EXISTS" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Encriptar contraseña
    const hash = await bcryptjs.hash(contrasena, 10);

    // 4. Insertar usuario en la base de datos
    const usuarioCreado = await prisma.usuarios.create({
      data: {
        id_rol: 6, // Rol por defecto: CLIENTE
        usuario_ci: parseInt(usuario_ci, 10),
        nombre,
        apellido,
        nombre_usuario,
        telefono,
        correo_electronico,
        contrasena_hash: hash,
        activo: true,
      },
    });

    // 5. Generación del AccessToken para logueo automático
    const token = jwt.sign(
      { id: usuarioCreado.id_usuario, rol: "CLIENTE" },
      process.env.JWT_SECRET || "clave_secreta_temporal",
      { expiresIn: "8h" }
    );

    // 6. Preparar objeto de usuario normalizado (sin el hash de la contraseña)
    const userData = {
      id: usuarioCreado.id_usuario,
      rol: ROLES_MAP[6], // "CLIENTE"
      activo: usuarioCreado.activo,
      nombre: usuarioCreado.nombre,
      apellido: usuarioCreado.apellido,
      username: usuarioCreado.nombre_usuario,
      correo: usuarioCreado.correo_electronico,
      telefono: usuarioCreado.telefono,
      ci: usuarioCreado.usuario_ci
    };

    return NextResponse.json({
      message: "Registro exitoso",
      accessToken: token,
      user: userData,
    }, { status: 201, headers: corsHeaders });

  } catch (error: unknown) {
    const mensajeError = error instanceof Error ? error.message : "SERVER_ERROR";
    return NextResponse.json(
      { error: mensajeError },
      { status: 500, headers: corsHeaders }
    );
  }
}