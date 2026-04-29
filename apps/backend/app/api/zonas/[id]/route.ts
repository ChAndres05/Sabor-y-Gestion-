import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { Prisma } from '../../../../app/generated/prisma/client';

/**
 * ACTUALIZAR ZONA (PATCH)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let zonaId = '';
  try {
    zonaId = (await params).id;
    const id_zona = parseInt(zonaId);

    // Error 400: ID no es un número válido
    if (isNaN(id_zona)) {
      return NextResponse.json({ error: 'El ID de zona proporcionado no es válido' }, { status: 400 });
    }

    const body = await request.json();

    // Error 400: Body vacío
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron datos para actualizar' }, { status: 400 });
    }

    const updatedZona = await prisma.zonas.update({
      where: { id_zona },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion
      },
    });

    return NextResponse.json(updatedZona);

  } catch (error) {
    // Manejo de errores específicos de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error P2025: Registro no encontrado
      if (error.code === 'P2025') {
        return NextResponse.json({ error: `La zona con ID ${zonaId} no existe` }, { status: 404 });
      }
      // Error P2002: Violación de restricción única (ej. nombre duplicado si fuera único)
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una zona con ese nombre' }, { status: 409 });
      }
    }

    console.error('Error en PATCH zonas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * ELIMINAR ZONA (DELETE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const id_zona = parseInt(id);

    if (isNaN(id_zona)) {
      return NextResponse.json({ error: 'ID de zona inválido' }, { status: 400 });
    }

    // 1. Verificar existencia
    const existingZona = await prisma.zonas.findUnique({
      where: { id_zona },
    });

    if (!existingZona) {
      return NextResponse.json({ error: 'Zona no encontrada' }, { status: 404 });
    }

    /** 
     * USAR UNA TRANSACCIÓN 
     * Esto elimina las mesas y la zona en un solo bloque atómico.
     */
    await prisma.$transaction(async (tx) => {
      // Primero eliminamos todas las mesas asociadas a esa zona
      await tx.mesas.deleteMany({
        where: { id_zona },
      });

      // Luego eliminamos la zona
      await tx.zonas.delete({
        where: { id_zona },
      });
    });

    return NextResponse.json({ 
      message: 'Zona y todas sus mesas asociadas han sido eliminadas' 
    }, { status: 200 });

  } catch (error) {
    console.error('Error en DELETE zonas:', error);
    return NextResponse.json({ 
      error: 'No se pudo completar la eliminación en cascada' 
    }, { status: 500 });
  }
}
