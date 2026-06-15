import { useState } from 'react';
import type { AuthUser } from '../auth/types/auth.types';
import { Sidebar } from '../../shared/components/Sidebar';

interface AdminMenuPageProps {
  user: AuthUser;
  onLogout: () => void;
  onOpenUsers: () => void;
  onOpenMenuManagement: () => void;
  onOpenTableManagement: () => void;
  onOpenKitchenMonitor: () => void;
  onOpenReservations: () => void;
  onOpenOrders: () => void;
  onOpenCaja: () => void;
  onOpenInvoices: () => void;
  onOpenCoupons: () => void;
  onOpenDashboard: () => void;
}

const menuItems = [
  { key: 'dashboard', label: 'Dashboard de Información', enabled: true },
  { key: 'productos', label: 'Administración de productos', enabled: true },
  { key: 'mesas', label: 'Gestión de Mesas', enabled: true },
  { key: 'cocina', label: 'Monitor de cocina', enabled: true },
  { key: 'reservas', label: 'Gestión de reservas', enabled: true },
  { key: 'pedidos', label: 'Gestión de pedidos', enabled: true },
  { key: 'delivery', label: 'Atención Delivery', enabled: false },
  { key: 'facturacion', label: 'Facturación', enabled: true },
  { key: 'facturas-admin', label: 'Control de Facturas', enabled: true },
  { key: 'cupones', label: 'Gestión de Cupones', enabled: true },
  { key: 'cierre', label: 'Cierre de Caja', enabled: false },
  { key: 'inventario', label: 'Gestión de Inventario', enabled: false },
  { key: 'usuarios', label: 'Gestión de Usuarios', enabled: true },
];

export default function AdminMenuPage({
  user,
  onLogout,
  onOpenUsers,
  onOpenMenuManagement,
  onOpenTableManagement,
  onOpenKitchenMonitor,
  onOpenReservations,
  onOpenOrders,
  onOpenCaja,
  onOpenInvoices,
  onOpenCoupons,
  onOpenDashboard,
}: AdminMenuPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-primary px-4 py-8 text-white font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setIsSidebarOpen(true)} className="text-2xl text-white">☰</button>
          <span className="font-bold uppercase tracking-tight">Sabor & Gestión</span>
          <div className="w-6"></div> {/* Spacer to center title */}
        </div>

        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          user={user} 
          onLogout={onLogout}
          options={[
            { key: 'dashboard', label: 'Dashboard de Información', onClick: () => { onOpenDashboard(); setIsSidebarOpen(false); } },
            { key: 'productos', label: 'Administración de productos', onClick: () => { onOpenMenuManagement(); setIsSidebarOpen(false); } },
            { key: 'mesas', label: 'Gestión de Mesas', onClick: () => { onOpenTableManagement(); setIsSidebarOpen(false); } },
            { key: 'cocina', label: 'Monitor de cocina', onClick: () => { onOpenKitchenMonitor(); setIsSidebarOpen(false); } },
            { key: 'reservas', label: 'Gestión de reservas', onClick: () => { onOpenReservations(); setIsSidebarOpen(false); } },
            { key: 'pedidos', label: 'Gestión de pedidos', onClick: () => { onOpenOrders(); setIsSidebarOpen(false); } },
            { key: 'facturacion', label: 'Facturación', onClick: () => { onOpenCaja(); setIsSidebarOpen(false); } },
            { key: 'facturas-admin', label: 'Control de Facturas', onClick: () => { onOpenInvoices(); setIsSidebarOpen(false); } },
            { key: 'cupones', label: 'Gestión de Cupones', onClick: () => { onOpenCoupons(); setIsSidebarOpen(false); } },
            { key: 'usuarios', label: 'Gestión de Usuarios', onClick: () => { onOpenUsers(); setIsSidebarOpen(false); } }
          ]}
        />

        <div className="space-y-1">
          {menuItems.map((item) => {
            const handleClick = () => {
              if (!item.enabled) return;

              if (item.key === 'usuarios') {
                onOpenUsers();
              }

              if (item.key === 'dashboard') {
                onOpenDashboard();
              }

              if (item.key === 'productos') {
                onOpenMenuManagement();
              }

              if (item.key === 'mesas') {
                onOpenTableManagement();
              }
              
              if (item.key === 'cocina') {
                onOpenKitchenMonitor();
              }
              
              if (item.key === 'reservas') {
                onOpenReservations();
              }
              
              if (item.key === 'pedidos') {
                onOpenOrders();
              }

              if (item.key === 'facturacion') {
                onOpenCaja();
              }

              if (item.key === 'facturas-admin') {
                onOpenInvoices();
              }

              if (item.key === 'cupones') {
                onOpenCoupons();
              }
            };

            return (
              <button
                key={item.key}
                type="button"
                onClick={handleClick}
                disabled={!item.enabled}
                className={`flex w-full items-center justify-between border-b border-white/40 py-5 text-left text-content font-semibold transition-colors ${
                  item.enabled
                    ? 'cursor-pointer hover:bg-white/10'
                    : 'cursor-default opacity-50'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-subtitle font-bold">{'>'}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex items-end justify-between pt-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 shadow-inner">
              <span className="text-3xl">👤</span>
            </div>

            <div>
              <p className="text-subtitle font-bold leading-tight">
                {user.nombre} {user.apellido}
              </p>
              <p className="text-content opacity-90">{user.correo}</p>
              <p className="text-content font-bold uppercase tracking-wider text-white/90">
                {user.rol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl bg-white/20 p-3 text-subtitle font-bold transition-colors shadow-lg hover:bg-primary-hover"
          >
            {'>'}
          </button>
        </div>
      </div>
    </div>
  );
}