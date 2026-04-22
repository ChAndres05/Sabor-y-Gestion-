import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// Evita que Next.js cachee esta ruta (obligatorio para búsquedas en tiempo real)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Obtener los parámetros de la URL
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const rol = searchParams.get('rol') || 'Todos';

  // Convertimos el rol a MAYÚSCULAS para que coincida exactamente con la Base de Datos
  const rolDB = rol === 'Todos' ? 'Todos' : rol.toUpperCase();

  try {
    const whereUsuarios: any = {};
    
    if (rolDB !== 'Todos') {
      whereUsuarios.rol = { nombre: rolDB };
    }

    if (q) {
      // Separar la búsqueda por espacios para buscar "Juan Perez" correctamente
      const terms = q.split(' ').filter(t => t.trim() !== '');
      whereUsuarios.AND = terms.map(term => {
        const orConditions: any[] = [
          { nombre: { contains: term, mode: 'insensitive' } },
          { apellido: { contains: term, mode: 'insensitive' } }
        ];
        if (!isNaN(Number(term))) {
          orConditions.push({ usuario_ci: Number(term) });
        }
        return { OR: orConditions };
      });
    }

    const usuariosDB = await prisma.usuarios.findMany({
      where: whereUsuarios,
      include: { rol: true } 
    });

    // Mapeamos al formato que espera el frontend
    const resultados = usuariosDB.map(u => ({
      id: `u-${u.id_usuario}`,
      nombre: u.nombre,
      apellido: u.apellido || '',
      documento: u.usuario_ci.toString(),
      rol: u.rol.nombre, 
      correo: u.correo_electronico || 'N/A',
      estado: u.activo
    }));

    // Retornamos los datos habilitando CORS para que el frontend no sea bloqueado
    return NextResponse.json(resultados, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return NextResponse.json(
      { error: 'Error al realizar la búsqueda' }, 
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}