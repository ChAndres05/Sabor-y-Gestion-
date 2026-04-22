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
  
  // Estados para datos del Backend
  const [resultados, setResultados] = useState<UsuarioBusqueda[]>([]);
  const [cargando, setCargando] = useState(false);

  // --- NUEVOS ESTADOS PARA EDICIÓN ---
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioBusqueda | null>(null);
  const [nuevoRol, setNuevoRol] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<boolean>(true);

  // --- EFECTO DE BÚSQUEDA EN TIEMPO REAL ---
  useEffect(() => {
    const buscarEnBaseDeDatos = async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams({
          q: terminoBusqueda,
          rol: filtroRol
        });
        
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

    const timeoutId = setTimeout(() => {
      buscarEnBaseDeDatos();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [terminoBusqueda, filtroRol]);

  // --- FUNCIÓN PARA GUARDAR CAMBIOS ---
  const guardarCambios = async () => {
    if (!usuarioEditando) return;
    setCargando(true);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/admin/usuarios`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuarioEditando.id.replace('u-', ''), // Extraemos solo el número
          nombreRol: nuevoRol,
          estado: nuevoEstado
        })
      });

      if (res.ok) {
        // Actualizamos la lista localmente para reflejar el cambio de inmediato
        setResultados(prev => prev.map(u => 
          u.id === usuarioEditando.id ? { ...u, rol: nuevoRol, estado: nuevoEstado } : u
        ));
        setUsuarioEditando(null); // Cerramos el modal
      } else {
        alert("Error al actualizar el rol");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setCargando(false);
    }
  };

  const BusquedaView = () => (
    <div className="space-y-6">
      {/* SECCIÓN DE FILTROS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filtrar por Categoría / Rol</label>
        <div className="flex flex-wrap gap-3">
          {['Todos', 'Administrador', 'Mesero', 'Cocinero', 'Cajero', 'Repartidor', 'Cliente'].map(rol => (
            <button
              key={rol}
              onClick={() => setFiltroRol(rol)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                filtroRol === rol 
                ? 'bg-orange-500 text-white shadow-orange-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {rol === 'Todos' ? 'Todos' : `${rol}s`}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative w-full">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input 
          type="text"
          placeholder="Escribe un nombre, apellido o CI para buscar al instante..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
        />
        {cargando && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 animate-spin">⏳</span>
        )}
      </div>

      {/* TABLA DE RESULTADOS */}
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
                    No se encontraron resultados...
                  </td>
                </tr>
              ) : (
                resultados.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => {
                      setUsuarioEditando(u);
                      setNuevoRol(u.rol.toUpperCase());
                      setNuevoEstado(u.estado);
                    }}
                    className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 text-gray-400 font-mono text-xs">{u.documento}</td>
                    <td className="p-4 font-bold text-gray-700 group-hover:text-orange-600">
                      {u.nombre} {u.apellido}
                    </td>
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

      {/* MODAL DE EDICIÓN */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Editar Perfil</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Documento: {usuarioEditando.documento}</p>
              </div>
              <button 
                onClick={() => setUsuarioEditando(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-400"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Personal Seleccionado</label>
                <div className="text-sm font-bold text-slate-700 bg-gray-100 p-4 rounded-2xl border border-gray-200 flex flex-col gap-1">
                  <span>{usuarioEditando.nombre} {usuarioEditando.apellido}</span>
                  <span className="text-xs font-normal text-gray-500">✉️ {usuarioEditando.correo}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Asignar Nuevo Rol</label>
                <div className="relative">
                  <select 
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-50/50 outline-none transition-all appearance-none cursor-pointer"
                    value={nuevoRol}
                    onChange={(e) => setNuevoRol(e.target.value)}
                  >
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                    <option value="MESERO">MESERO</option>
                    <option value="COCINERO">COCINERO</option>
                    <option value="CAJERO">CAJERO</option>
                    <option value="REPARTIDOR">REPARTIDOR</option>
                    <option value="CLIENTE">CLIENTE</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Estado del Usuario</label>
                <div className="relative">
                  <select 
                    className={`w-full p-4 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 appearance-none cursor-pointer transition-all ${
                      nuevoEstado 
                        ? 'bg-green-50 text-green-700 focus:border-green-500 focus:ring-green-50/50' 
                        : 'bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-50/50'
                    }`}
                    value={nuevoEstado ? 'ACTIVO' : 'INACTIVO'}
                    onChange={(e) => setNuevoEstado(e.target.value === 'ACTIVO')}
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${nuevoEstado ? 'text-green-500' : 'text-red-500'}`}>▼</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setUsuarioEditando(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={guardarCambios}
                  disabled={cargando}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {cargando ? 'GUARDANDO...' : 'CONFIRMAR CAMBIOS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden w-full font-sans">
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
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Gestión de Personal</h2>
        </header>
        <section className="p-8 flex-1 overflow-auto bg-gray-50">
          {vista === 'busqueda' && <BusquedaView />}
        </section>
      </main>
    </div>
  );
}