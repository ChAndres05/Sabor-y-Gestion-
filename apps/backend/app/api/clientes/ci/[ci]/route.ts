import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ ci: string }> }) {
  try {
    const { ci: ciParam } = await params;
    const ci = parseInt(ciParam, 10);
    
    if (isNaN(ci)) {
      return NextResponse.json({ error: 'CI inválido' }, { status: 400 });
    }

    const cliente = await prisma.usuarios.findFirst({
      where: {
        usuario_ci: ci,
        id_rol: 5
      },
      include: {
        rol: true
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error('Error buscando cliente por CI:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
