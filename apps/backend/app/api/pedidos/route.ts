import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher'; // <-- 1. Importamos la instancia de Pusher
import bcryptjs from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { id_mesa, id_usuario_mesero, id_usuario_cliente, observaciones, cliente_nombre, cliente_ci, cliente_telefono } = body;

    if (!id_mesa || !id_usuario_mesero) {
      return NextResponse.json({ error: 'id_mesa y id_usuario_mesero son requeridos' }, { status: 400 });
    }

    // --- LOGICA DE CLIENTE INVITADO O CREACION DE CUENTA AUTOMATICA ---
    if (!id_usuario_cliente && cliente_nombre) {
      if (cliente_ci && cliente_ci.trim() !== '' && cliente_ci !== '0') {
        // Verificar si el CI ya existe para evitar errores de restriccion unica
        const parsedCi = parseInt(cliente_ci);
        if (!isNaN(parsedCi)) {
          const existingUserByCi = await prisma.usuarios.findUnique({ where: { usuario_ci: parsedCi } });
          if (existingUserByCi) {
             id_usuario_cliente = existingUserByCi.id_usuario;
          }
        }

        if (!id_usuario_cliente) {
          // Crear cuenta automáticamente
          const usernameBase = cliente_nombre.replace(/\s+/g, '').toLowerCase();
          let username = usernameBase;
          
          // Verificar si el username ya existe
          let userExists = await prisma.usuarios.findUnique({ where: { nombre_usuario: username } });
          let counter = 1;
          while (userExists) {
            username = `${usernameBase}${counter}`;
            userExists = await prisma.usuarios.findUnique({ where: { nombre_usuario: username } });
          }

          const passwordPlain = `${username}${cliente_ci}`;
          const hash = await bcryptjs.hash(passwordPlain, 10);

          let rolCliente = await prisma.roles.findFirst({
            where: { nombre: { contains: 'CLIENTE', mode: 'insensitive' } }
          });

          if (!rolCliente) {
            rolCliente = await prisma.roles.create({ data: { nombre: 'CLIENTE' } });
          }

          // Lógica para separar nombre y apellido según la cantidad de palabras
          let parsedNombre = cliente_nombre.trim();
          let parsedApellido = null;
          const nameParts = parsedNombre.split(/\s+/);

          if (nameParts.length === 2) {
            // Ej: "Juan Martinez" -> Nombre: Juan, Apellido: Martinez
            parsedNombre = nameParts[0];
            parsedApellido = nameParts[1];
          } else if (nameParts.length === 3) {
            // Ej: "Juan Martinez Cruz" -> Nombre: Juan, Apellido: Martinez Cruz
            parsedNombre = nameParts[0];
            parsedApellido = `${nameParts[1]} ${nameParts[2]}`;
          } else if (nameParts.length >= 4) {
            // Ej: "Juan Mario Cruz Martinez" -> Nombre: Juan Mario, Apellido: Cruz Martinez
            parsedNombre = `${nameParts[0]} ${nameParts[1]}`;
            parsedApellido = nameParts.slice(2).join(' ');
          }

          const nuevoUsuario = await prisma.usuarios.create({
            data: {
              nombre: parsedNombre,
              apellido: parsedApellido,
              usuario_ci: !isNaN(parsedCi) ? parsedCi : Math.floor(Math.random() * 1000000),
              nombre_usuario: username,
              contrasena_hash: hash,
              telefono: cliente_telefono || null,
              id_rol: rolCliente.id_rol,
              activo: true,
            }
          });

          id_usuario_cliente = nuevoUsuario.id_usuario;
        }
      } else {
        // Pedido de Invitado: Agregamos el nombre a las observaciones para no perderlo
        const guestInfo = `Invitado: ${cliente_nombre}`;
        observaciones = observaciones ? `${guestInfo} | ${observaciones}` : guestInfo;
      }
    }
    // ------------------------------------------------------------------

    // --- NUEVO: REGLA DE NEGOCIO PARA PROTEGER LA CUENTA ---
    // Verificamos el estado actual de la mesa antes de crear cualquier pedido
    const mesaActual = await prisma.mesas.findUnique({
      where: { id_mesa: Number(id_mesa) }
    });

    if (mesaActual?.estado === 'CUENTA_SOLICITADA') {
      return NextResponse.json(
        { error: 'La cuenta ya fue solicitada. No se pueden agregar pedidos adicionales a esta mesa.' },
        { status: 400 }
      );
    }
    // -------------------------------------------------------

    let tipoPedido = await prisma.tipos_pedido.findFirst({
      where: { nombre: { contains: 'LOCAL', mode: 'insensitive' } }
    });

    if (!tipoPedido) {
      tipoPedido = await prisma.tipos_pedido.findFirst();
    }

    if (!tipoPedido) {
      return NextResponse.json({ error: 'No hay tipos de pedido configurados en la BD' }, { status: 400 });
    }

    let mesero = await prisma.usuarios.findUnique({ where: { id_usuario: id_usuario_mesero } });
    if (!mesero) {
      mesero = await prisma.usuarios.findFirst({
        where: { rol: { nombre: { contains: 'MESERO', mode: 'insensitive' } } }
      }) ?? await prisma.usuarios.findFirst();
    }
    if (!mesero) {
      return NextResponse.json({ error: 'No hay usuarios disponibles' }, { status: 400 });
    }

    let clienteId = id_usuario_cliente;
    if (clienteId) {
      const cliente = await prisma.usuarios.findUnique({ where: { id_usuario: clienteId } });
      if (!cliente) clienteId = null;
    }

    // Usar transacción para crear pedido y actualizar estado de la mesa
    // Nota: Esto funciona perfectamente para pedidos adicionales, si la mesa ya está 'OCUPADA', simplemente se mantiene 'OCUPADA'.
    const [nuevoPedido] = await prisma.$transaction([
      prisma.pedidos.create({
        data: {
          id_tipo_pedido: tipoPedido.id_tipo_pedido,
          id_mesa,
          id_usuario_mesero: mesero.id_usuario,
          id_usuario_cliente: clienteId,
          estado: 'REGISTRADO',
          observaciones,
          subtotal: 0,
          impuesto: 0,
          descuento: 0,
          total: 0,
        },
        include: {
          mesa: true // <-- 2. Incluimos la mesa para el monitor de cocina
        }
      }),
      prisma.mesas.update({
        where: { id_mesa },
        data: { estado: 'OCUPADA' }
      })
    ]);

    // 3. Emitimos el evento en tiempo real a la cocina
    await pusherServer.trigger('cocina-channel', 'nuevo-pedido', nuevoPedido);

    return NextResponse.json(nuevoPedido, { status: 201 });
  } catch (error: unknown) { // <-- NUEVO: typed as unknown para evitar el lint error
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error('Error creando pedido:', errorMessage);
    return NextResponse.json({ error: 'Error interno del servidor al crear el pedido' }, { status: 500 });
  }
}