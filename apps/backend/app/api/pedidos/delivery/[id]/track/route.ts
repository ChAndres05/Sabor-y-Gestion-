import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);

    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Coordenadas lat/lng inválidas' }, { status: 400 });
    }

    // Broadcast the delivery person's real-time coordinate update via Pusher WebSockets
    try {
      await pusherServer.trigger(`delivery-tracking-${id_pedido}`, 'location-updated', {
        id_pedido,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    } catch (pushErr) {
      console.error('Error triggering location update Pusher event:', pushErr);
      return NextResponse.json({ error: 'Error al enviar ubicación por WebSockets' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Coordenadas transmitidas con éxito' });
  } catch (error: any) {
    console.error('Error in delivery track route:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar rastreo de delivery' },
      { status: 500 }
    );
  }
}
