import { mapBackendZone, mapBackendTable, type BackendZoneResponse, type BackendTableResponse } from '../mappers/tables.mapper';
import type { Zone, RestaurantTable, TableFormValues, ZoneFormValues, TableStatus } from '../../modules/tables/types/table.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const tablesApi = {
  
  /**
   * Lista TODAS las mesas registradas (Sabemos que esta ruta GET sí existe y funciona).
   */
  async listTables(): Promise<RestaurantTable[]> {
    const res = await fetch(`${API_URL}/api/admin/mesas`);
    if (!res.ok) throw new Error('Error al cargar mesas');
    const data = (await res.json()) as BackendTableResponse[];
    return data.map(mapBackendTable);
  },

  /**
   * Obtiene una sola mesa filtrando la lista completa.
   * Esto evita el error 405 porque no llamamos a la ruta /api/mesas/[id] con GET.
   */
  async getTableById(tableId: number): Promise<RestaurantTable | null> {
    try {
      const mesas = await this.listTables();
      const mesaEncontrada = mesas.find(m => m.id === tableId);
      return mesaEncontrada || null;
    } catch (error) {
      console.error(`Error al obtener la mesa ${tableId}:`, error);
      return null;
    }
  },

  async updateStatus(id: number, status: TableStatus): Promise<void> {
    const res = await fetch(`${API_URL}/api/mesas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status }),
    });
    
    if (!res.ok) throw new Error('No se pudo actualizar el estado de la mesa');
  },

  async deleteTable(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/admin/mesas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('No se pudo eliminar la mesa');
  },

  async listZones(): Promise<Zone[]> {
    const res = await fetch(`${API_URL}/api/admin/zonas`);
    if (!res.ok) throw new Error('Error al cargar zonas');
    const data = (await res.json()) as BackendZoneResponse[];
    return data.map(mapBackendZone).filter(z => z.activo);
  },

  async createZone(values: ZoneFormValues): Promise<Zone> {
    const res = await fetch(`${API_URL}/api/admin/zonas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: values.nombre }),
    });
    if (!res.ok) throw new Error('No se pudo crear la zona');
    return mapBackendZone((await res.json()) as BackendZoneResponse);
  },

  async deleteZone(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/zonas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('No se pudo eliminar la zona');
  },

  async createTable(values: TableFormValues): Promise<RestaurantTable> {
    const res = await fetch(`${API_URL}/api/admin/mesas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: values.numero,
        capacidad: values.capacidad,
        id_zona: values.zoneId,
        estado: 'LIBRE',
      }),
    });
    if (!res.ok) throw new Error('No se pudo crear la mesa');
    return mapBackendTable((await res.json()) as BackendTableResponse);
  },

  async updateTable(id: number, values: TableFormValues): Promise<RestaurantTable> {
    const res = await fetch(`${API_URL}/api/admin/mesas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: values.numero,
        capacidad: values.capacidad,
        id_zona: values.zoneId,
      }),
    });
    if (!res.ok) throw new Error('No se pudo actualizar la mesa');
    return mapBackendTable((await res.json()) as BackendTableResponse);
  },
};
