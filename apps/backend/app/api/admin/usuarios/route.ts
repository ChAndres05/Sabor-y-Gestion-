import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function PATCH(request: Request) {
  try {
    const { id_usuario, nombreRol, estado } = await request.json();

    // 1. Buscar el ID del rol basado en el nombre (ADMINISTRADOR, COCINERO, etc.)
    const rolEncontrado = await prisma.roles.findFirst({
      where: { nombre: nombreRol.toUpperCase() }
    });

    if (!rolEncontrado) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    }

    // 2. Actualizar el usuario
    const usuarioActualizado = await prisma.usuarios.update({
      where: { id_usuario: Number(id_usuario) },
      data: { 
        id_rol: rolEncontrado.id_rol,
        ...(estado !== undefined && { activo: estado })
      },
      include: { rol: true }
    });

    return NextResponse.json({
      success: true,
      usuario: {
        id: `u-${usuarioActualizado.id_usuario}`,
        rol: usuarioActualizado.rol.nombre
      }
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error('Error al actualizar rol:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Habilitar CORS para preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}