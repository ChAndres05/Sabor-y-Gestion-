import { useState, useEffect } from 'react';
import './App.css';

interface UsuarioBusqueda {
  id: string;
  nombre: string;
  apellido: string;
  documento: string;
  rol: string;
  correo: string;
  estado: boolean;
}

export default function App() {
  const [vista, setVista] = useState('busqueda');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');
  
  // Nuevos estados para manejar datos del Backend
  const [resultados, setResultados] = useState<UsuarioBusqueda[]>([]);
  const [cargando, setCargando] = useState(false);

  // --- EFECTO DE BÚSQUEDA EN TIEMPO REAL ---
  useEffect(() => {
    const buscarEnBaseDeDatos = async () => {
      setCargando(true);
      try {
        // Usamos URLSearchParams para construir la query string dinámicamente
        const params = new URLSearchParams({
          q: terminoBusqueda,
          rol: filtroRol
        });
        
        // Nos aseguramos de que la URL base no termine en / para luego concatenar el /api de forma segura
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
        const respuesta = await fetch(`${baseUrl}/api/busqueda?${params}`);
        const datos = await respuesta.json();
        
        if (Array.isArray(datos)) {
          setResultados(datos);
        }
      } catch (error) {
        console.error("Error conectando al backend:", error);
      } finally {
        setCargando(false);
      }
    };

    // Usamos un pequeño "Debounce" (retraso) de 300ms para no saturar la base de datos con cada tecla
    const timeoutId = setTimeout(() => {
      buscarEnBaseDeDatos();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [terminoBusqueda, filtroRol]); // Se ejecuta automáticamente si cambia el texto o el rol

  const BusquedaView = () => (
    <div className="space-y-6">
      {/* SECCIÓN DE FILTROS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filtrar por Categoría / Rol</label>
        <div className="flex flex-wrap gap-3">
          {['Todos', 'Administrador', 'Mesero', 'Cocinero', 'Cajero', 'Repartidor', 'Cliente'].map(rol => (
            <button
              key={rol}
              onClick={() => setFiltroRol(rol)} // Esto dispara el useEffect automáticamente
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                filtroRol === rol 
                ? 'bg-orange-500 text-white shadow-orange-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {rol === 'Todos' ? 'Todos' : `${rol}s`}
              {rol}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA AUTOMÁTICA (Sin botón) */}
      <div className="relative w-full">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input 
          type="text"
          placeholder="Escribe un nombre, apellido o CI para buscar al instante..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)} // Dispara la búsqueda con cada letra
        />
        {cargando && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 animate-spin">⏳</span>
        )}
      </div>

      {/* VENTANA DE RESULTADOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-700 text-sm">Resultados de la Base de Datos ({resultados.length})</h3>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-black uppercase">LIVE DB</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-500">
              <tr>
                <th className="p-4">CI / Doc</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Correo</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!cargando && resultados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                    {terminoBusqueda === '' ? 'Selecciona un rol o escribe para empezar la búsqueda...' : `No se encontraron resultados para "${terminoBusqueda}"`}
                  </td>
                </tr>
              ) : (
                resultados.map(u => (
                  <tr key={u.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="p-4 text-gray-400 font-mono text-xs">{u.documento}</td>
                    <td className="p-4 font-bold text-gray-700">{u.nombre} {u.apellido}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded shadow-sm ${
                        u.rol.toUpperCase() === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-700' :
                        u.rol.toUpperCase() === 'CLIENTE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {u.rol.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{u.correo}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <div className={`w-2 h-2 rounded-full ${u.estado ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden w-full">
       {/* SIDEBAR */}
       <aside className="w-64 bg-slate-900 flex flex-col shadow-xl">
        <div className="p-6">
          <h1 className="text-white text-xl font-black tracking-tighter">DEV<span className="text-orange-500">COLLAB</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <button onClick={() => setVista('busqueda')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${vista === 'busqueda' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span>🔍</span> Búsqueda Dinámica
          </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Base de Datos</h2>
        </header>
        <section className="p-8 flex-1 overflow-auto bg-gray-50">
          {vista === 'busqueda' && <BusquedaView />}
        </section>
      </main>
    </div>
  );
}