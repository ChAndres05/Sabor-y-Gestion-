// apps/frontend/src/modules/cocina/api/cocina.api.ts
const API_URL = import.meta.env.VITE_API_URL;

export const cocinaApi = {
    // Marcar un plato individual como listo
    marcarPlatoPreparado: async (idDetalle: number, preparado: boolean) => {
        const response = await fetch(`${API_URL}/api/cocina/detalles/${idDetalle}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preparado }),
        });
        if (!response.ok) throw new Error('Error al actualizar el plato');
        return response.json();
    },

    // Marcar el pedido completo (botón desplegable/armado)
    actualizarEstadoArmado: async (idPedido: number, armado: boolean) => {
        const response = await fetch(`${API_URL}/api/cocina/pedidos/${idPedido}/armado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ armado }),
        });
        if (!response.ok) throw new Error('Error al actualizar el armado del pedido');
        return response.json();
    }
};