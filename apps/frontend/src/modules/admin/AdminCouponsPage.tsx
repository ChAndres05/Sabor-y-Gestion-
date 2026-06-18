import { useState, useMemo, useEffect } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { cajaApi } from '../../shared/api/caja.api';
import type { Coupon } from '../../shared/api/caja.api';

interface AdminCouponsPageProps {
  onBack: () => void;
}

type FeedbackState = { type: 'success' | 'error' | 'info'; title: string; message: string; } | null;


export default function AdminCouponsPage({ onBack }: AdminCouponsPageProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const list = await cajaApi.listCoupons();
      setCoupons(list);
    } catch {
      setFeedback({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los cupones desde el servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  
  // Manual creation form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newDiscountValue, setNewDiscountValue] = useState<number>(10);
  const [newMinPurchase, setNewMinPurchase] = useState<number>(50);
  const [newExpirationDate, setNewExpirationDate] = useState<string>('2026-12-31');
  const [newUsageLimit, setNewUsageLimit] = useState<number>(100);
  const [newDescription, setNewDescription] = useState('');

  // Delete confirmation state
  const [couponToDelete, setCouponToDelete] = useState<{ id: string; code: string } | null>(null);

  // Send to frequent clients modal state
  const [couponToSend, setCouponToSend] = useState<Coupon | null>(null);
  const [allClients, setAllClients] = useState<{ id: number; name: string; email: string; purchasesCount: number }[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [activeTab, setActiveTab] = useState<'frequent' | 'all'>('frequent');

  // Edit form state
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [editDiscountValue, setEditDiscountValue] = useState<number>(10);
  const [editMinPurchase, setEditMinPurchase] = useState<number>(50);
  const [editExpirationDate, setEditExpirationDate] = useState<string>('2026-12-31');
  const [editUsageLimit, setEditUsageLimit] = useState<number>(100);
  const [editDescription, setEditDescription] = useState('');

  // Statistics calculation
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.status === 'active').length;
    const inactive = coupons.filter(c => c.status === 'inactive').length;
    const expired = coupons.filter(c => c.status === 'expired').length;
    
    return {
      total,
      active,
      inactive,
      expired
    };
  }, [coupons]);

  // Filtering
  const filteredCoupons = useMemo(() => {
    return coupons.filter(coupon => {
      const matchSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          coupon.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || coupon.status === statusFilter;
      const matchType = typeFilter === 'all' || coupon.discountType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [coupons, searchTerm, statusFilter, typeFilter]);

  // Generate a random mock coupon
  const handleGenerateMock = async () => {
    const prefixes = ['SABOR', 'GUSTO', 'PROMO', 'DESCUENTO', 'DELICIA', 'REDUCCION', 'MENU', 'MEGAPACK', 'VOUCHER', 'CHEFSPECIAL'];
    const values = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
    const types: ('percentage' | 'fixed')[] = ['percentage', 'fixed'];
    
    const discountType = types[Math.floor(Math.random() * types.length)];
    const rawValue = values[Math.floor(Math.random() * values.length)];
    
    const discountValue = discountType === 'percentage' ? Math.min(rawValue, 50) : rawValue;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const code = `${prefix}${discountValue}`;
    
    if (coupons.some(c => c.code.toUpperCase() === code.toUpperCase())) {
      setFeedback({
        type: 'info',
        title: 'Cupón Existente',
        message: `El código ${code} ya existe. ¡Intentemos generar otro!`
      });
      return;
    }

    const minPurchase = Math.floor(Math.random() * 5) * 20 + 40;
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(today.getMonth() + Math.floor(Math.random() * 6) + 1);
    const expirationDate = futureDate.toISOString().split('T')[0];
    
    const usageLimit = Math.floor(Math.random() * 10) * 10 + 20;
    
    const descriptions = [
      `Descuento especial de ${discountValue}${discountType === 'percentage' ? '%' : ' Bs.'} para clientes distinguidos`,
      `Ahorra ${discountValue}${discountType === 'percentage' ? '%' : ' Bs.'} en tu siguiente consumo`,
      `Promoción de temporada: ${discountValue}${discountType === 'percentage' ? '%' : ' Bs.'} de descuento en el total`,
      `Descuento de ${discountValue}${discountType === 'percentage' ? '%' : ' Bs.'} para probar los nuevos platos del menú`
    ];
    
    const couponData = {
      code,
      discountType,
      discountValue,
      minPurchase,
      expirationDate,
      usageLimit,
      description: descriptions[Math.floor(Math.random() * descriptions.length)] + ` (Mínimo de compra: Bs. ${minPurchase})`
    };

    try {
      const newCoupon = await cajaApi.createCoupon(couponData);
      setCoupons(prev => [newCoupon, ...prev]);
      setFeedback({
        type: 'success',
        title: 'Cupón Aleatorio Generado',
        message: `Se ha generado el cupón "${code}" con valor de ${discountValue}${discountType === 'percentage' ? '%' : ' Bs.'} correctamente.`
      });
    } catch (error) {
      const err = error as Error;
      setFeedback({
        type: 'error',
        title: 'Error al generar cupón',
        message: err.message || 'Error en el servidor.'
      });
    }
  };

  const handleOpenSendModal = async (coupon: Coupon) => {
    setCouponToSend(coupon);
    setIsLoadingClients(true);
    setActiveTab('frequent');
    try {
      const clients = await cajaApi.listFrequentClients();
      setAllClients(clients);
      // Select frequent clients by default
      const frequent = clients.filter(c => c.purchasesCount > 5);
      setSelectedClients(frequent.map(c => c.id));
    } catch {
      setFeedback({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar la lista de clientes.'
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const visibleClients = useMemo(() => {
    if (activeTab === 'frequent') {
      return allClients.filter(c => c.purchasesCount > 5);
    }
    return allClients;
  }, [allClients, activeTab]);

  const handleToggleSelectAll = () => {
    const visibleIds = visibleClients.map(c => c.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedClients.includes(id));

    if (allVisibleSelected) {
      setSelectedClients(selectedClients.filter(id => !visibleIds.includes(id)));
    } else {
      const newSelection = [...selectedClients];
      visibleIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      setSelectedClients(newSelection);
    }
  };

  const handleToggleSelectClient = (id: number) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(clientId => clientId !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const handleSendCoupon = async () => {
    if (!couponToSend) return;
    if (selectedClients.length === 0) {
      setFeedback({
        type: 'error',
        title: 'Selección vacía',
        message: 'Debe seleccionar al menos un cliente para realizar el envío.'
      });
      return;
    }
    setIsSendingEmails(true);
    try {
      const response = await cajaApi.sendCouponToFrequentClients(couponToSend.id, selectedClients);
      setFeedback({
        type: 'success',
        title: 'Cupones Enviados',
        message: `Se ha enviado el cupón "${couponToSend.code}" a ${response.totalSent} cliente(s) seleccionado(s) por correo.`
      });
      setCouponToSend(null);
    } catch (error) {
      const err = error as Error;
      setFeedback({
        type: 'error',
        title: 'Error al enviar cupones',
        message: err.message || 'Ocurrió un error en el servidor.'
      });
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Create coupon manually
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = newCode.toUpperCase().replace(/\s+/g, '');
    if (!code) {
      setFeedback({ type: 'error', title: 'Datos Inválidos', message: 'Por favor, ingrese un código para el cupón.' });
      return;
    }

    if (newDiscountValue <= 0 || (newDiscountType === 'percentage' && newDiscountValue > 100)) {
      setFeedback({ type: 'error', title: 'Valor Inválidos', message: 'El descuento debe ser mayor que 0. En porcentaje no debe superar el 100%.' });
      return;
    }

    const couponData = {
      code,
      discountType: newDiscountType,
      discountValue: newDiscountValue,
      minPurchase: newMinPurchase,
      expirationDate: newExpirationDate,
      usageLimit: newUsageLimit,
      description: newDescription || `Descuento del ${newDiscountValue}${newDiscountType === 'percentage' ? '%' : ' Bs.'} en consumos mínimos de Bs. ${newMinPurchase}.`
    };

    try {
      const newCoupon = await cajaApi.createCoupon(couponData);
      setCoupons(prev => [newCoupon, ...prev]);
      setIsFormOpen(false);
      
      // Reset fields
      setNewCode('');
      setNewDiscountType('percentage');
      setNewDiscountValue(10);
      setNewMinPurchase(50);
      setNewExpirationDate('2026-12-31');
      setNewUsageLimit(100);
      setNewDescription('');

      setFeedback({
        type: 'success',
        title: 'Cupón Creado',
        message: `El cupón "${code}" ha sido creado con éxito.`
      });
    } catch (error) {
      const err = error as Error;
      setFeedback({
        type: 'error',
        title: 'Error al crear cupón',
        message: err.message || 'Error en el servidor.'
      });
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (id: string) => {
    const coupon = coupons.find(c => c.id === id);
    if (!coupon) return;

    let nextStatus: 'active' | 'inactive' = 'active';
    if (coupon.status === 'active') {
      nextStatus = 'inactive';
    }

    try {
      const updated = await cajaApi.updateCoupon(id, { status: nextStatus });
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
    } catch (error) {
      const err = error as Error;
      setFeedback({
        type: 'error',
        title: 'Error al cambiar estado',
        message: err.message || 'No se pudo cambiar el estado del cupón.'
      });
    }
  };

  // Delete coupon confirmation trigger
  const handleDeleteCoupon = (id: string, code: string) => {
    setCouponToDelete({ id, code });
  };

  // Start editing coupon
  const handleStartEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditCode(coupon.code);
    setEditDiscountType(coupon.discountType);
    setEditDiscountValue(coupon.discountValue);
    setEditMinPurchase(coupon.minPurchase);
    setEditExpirationDate(coupon.expirationDate);
    setEditUsageLimit(coupon.usageLimit);
    setEditDescription(coupon.description);
  };

  // Update coupon
  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    const code = editCode.toUpperCase().replace(/\s+/g, '');
    if (!code) {
      setFeedback({ type: 'error', title: 'Datos Inválidos', message: 'Por favor, ingrese un código para el cupón.' });
      return;
    }

    if (editDiscountValue <= 0 || (editDiscountType === 'percentage' && editDiscountValue > 100)) {
      setFeedback({ type: 'error', title: 'Valor Inválido', message: 'El descuento debe ser mayor que 0. En porcentaje no debe superar el 100%.' });
      return;
    }

    const updateData = {
      code,
      discountType: editDiscountType,
      discountValue: editDiscountValue,
      minPurchase: editMinPurchase,
      expirationDate: editExpirationDate,
      usageLimit: editUsageLimit,
      description: editDescription || `Descuento del ${editDiscountValue}${editDiscountType === 'percentage' ? '%' : ' Bs.'} en consumos mínimos de Bs. ${editMinPurchase}.`
    };

    try {
      const updated = await cajaApi.updateCoupon(editingCoupon.id, updateData);
      setCoupons(prev => prev.map(c => c.id === editingCoupon.id ? updated : c));
      setEditingCoupon(null);
      setFeedback({
        type: 'success',
        title: 'Cupón Actualizado',
        message: `El cupón "${code}" ha sido actualizado con éxito.`
      });
    } catch (error) {
      const err = error as Error;
      setFeedback({
        type: 'error',
        title: 'Error al actualizar cupón',
        message: err.message || 'Error en el servidor.'
      });
    }
  };

  // Copy coupon code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setFeedback({
      type: 'success',
      title: 'Copiado',
      message: `El código "${code}" ha sido copiado al portapapeles.`
    });
  };

  const formatCurrency = (value: number) => {
    return `Bs. ${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <main className="min-h-full bg-background px-3 py-5 text-text md:px-6 md:py-8 font-sans">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-[28px] leading-none text-text hover:opacity-85 transition-opacity"
            aria-label="Menú"
          >
            ☰
          </button>
          <div className="flex-1">
            <h1 className="text-title font-bold text-gray-900">Gestión de Cupones</h1>
            <p className="text-gray-500 text-[14px]">Genera, personaliza y simula cupones de descuento para tus clientes (Simulado localmente).</p>
          </div>
        </div>

        {/* KPI metrics cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Total Cupones</span>
            <span className="text-[26px] font-extrabold text-primary mt-2">
              {stats.total}
            </span>
            <span className="text-[11px] text-gray-500 mt-1">Registrados en sesión</span>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Cupones Activos</span>
            <span className="text-[26px] font-extrabold text-success mt-2">
              {stats.active}
            </span>
            <span className="text-[11px] text-success/80 mt-1">Disponibles para canje</span>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Inactivos / Pausados</span>
            <span className="text-[26px] font-extrabold text-process mt-2">
              {stats.inactive}
            </span>
            <span className="text-[11px] text-process/80 mt-1">Deshabilitados temporalmente</span>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Expirados</span>
            <span className="text-[26px] font-extrabold text-alert mt-2">
              {stats.expired}
            </span>
            <span className="text-[11px] text-alert/80 mt-1">Fecha límite superada</span>
          </div>
        </div>

        {/* Buttons / Actions Bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerateMock}
            className="flex items-center gap-2 px-6 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            <span>✨</span> Generar Cupón Aleatorio
          </button>
          
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold rounded-2xl hover:bg-[var(--color-primary)] hover:text-white transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            <span>➕</span> Crear Cupón Manual
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-[15px] font-bold mb-3 text-gray-700">Filtros y Búsqueda</h2>
          
          <div className="grid gap-4 md:grid-cols-12">
            {/* Search Input */}
            <div className="md:col-span-6">
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Buscar por código o descripción</label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Ej. SABOR20, Bienvenida..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-[13px] outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'expired')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none bg-white focus:border-primary transition-colors"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="expired">Expirados</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-gray-400 block mb-1">Tipo de Descuento</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as 'all' | 'percentage' | 'fixed')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none bg-white focus:border-primary transition-colors"
              >
                <option value="all">Todos los tipos</option>
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto Fijo (Bs.)</option>
              </select>
            </div>
          </div>

          {/* Reset Filters button */}
          {(searchTerm !== '' || statusFilter !== 'all' || typeFilter !== 'all') && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="text-[12px] font-bold text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Coupons list */}
        {isLoading ? (
          <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-sm border border-gray-100 animate-pulse text-gray-400 font-bold">
            Cargando cupones desde el servidor...
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-12 text-center shadow-sm border border-gray-100">
            <span className="text-[40px] block mb-2">🎟️</span>
            <p className="font-semibold text-gray-650">No se encontraron cupones</p>
            <p className="text-gray-400 text-[13px] mt-1">Pruebe generando un nuevo cupón aleatorio o cambiando los filtros.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCoupons.map((coupon) => (
              <div 
                key={coupon.id}
                className="relative rounded-[2rem] bg-white shadow-md border border-gray-150 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                {/* Status Indicator Bar */}
                <div className={`h-2 w-full ${
                  coupon.status === 'active' ? 'bg-success' : 
                  coupon.status === 'inactive' ? 'bg-process' : 'bg-alert'
                }`} />

                <div className="p-6 flex-1 flex flex-col justify-between">
                  {/* Top Header Card */}
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        coupon.status === 'active' ? 'bg-success/10 text-success' :
                        coupon.status === 'inactive' ? 'bg-process/10 text-process' : 'bg-alert/10 text-alert'
                      }`}>
                        {coupon.status === 'active' ? 'Activo' : coupon.status === 'inactive' ? 'Inactivo' : 'Expirado'}
                      </span>
                      
                      <div className="flex gap-1.5">
                        {coupon.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleOpenSendModal(coupon)}
                            title="Enviar a clientes frecuentes"
                            className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center justify-center text-[14px] transition-colors"
                          >
                            ✉️
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          title="Copiar código"
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-250 flex items-center justify-center text-[14px] transition-colors"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(coupon)}
                          title="Editar"
                          className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center text-[14px] transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          title="Eliminar"
                          className="w-8 h-8 rounded-full bg-alert/10 hover:bg-alert/20 text-alert flex items-center justify-center text-[14px] transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Promo Value */}
                    <div className="mb-3 text-center py-2 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                      <span className="block text-[11px] font-bold text-gray-400 uppercase">DESCUENTO</span>
                      <span className="text-[24px] font-extrabold text-primary">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `Bs. ${coupon.discountValue}`}
                      </span>
                    </div>

                    {/* Promo Code Display */}
                    <div className="flex items-center justify-between bg-gray-100 px-4 py-2.5 rounded-xl font-mono text-[14px] font-bold text-gray-800 mb-4 select-all">
                      <span>{coupon.code}</span>
                      <span className="text-[10px] text-gray-400 font-sans uppercase">Código</span>
                    </div>

                    <p className="text-[13px] text-gray-650 mb-4 min-h-[40px] leading-relaxed">
                      {coupon.description}
                    </p>
                  </div>

                  {/* Metadata and Toggles */}
                  <div className="border-t border-gray-100 pt-4 mt-auto space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                      <div>
                        <b>Min. Compra:</b> {formatCurrency(coupon.minPurchase)}
                      </div>
                      <div>
                        <b>Vence:</b> {formatDate(coupon.expirationDate)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                      <div>
                        <b>Límite Uso:</b> {coupon.usageLimit}
                      </div>
                      <div>
                        <b>Canjeados:</b> {coupon.usageCount}
                      </div>
                    </div>

                    {/* Progress Bar for usage */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }}
                      />
                    </div>

                    {/* Toggle Switch */}
                    {coupon.status !== 'expired' && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[12px] font-semibold text-gray-600">Habilitar / Pausar</span>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                            coupon.status === 'active' ? 'bg-success' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              coupon.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Creation Side-Drawer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-6 md:p-8 shadow-2xl border border-gray-100 flex flex-col my-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-[20px] font-black text-gray-800">
                Crear Nuevo Cupón
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-250 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4">
              {/* Promo Code */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">CÓDIGO DE CUPÓN</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="Ej. DESCUENTOPATRIA"
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary uppercase"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">TIPO DE DESCUENTO</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewDiscountType('percentage');
                      if (newDiscountValue > 100) setNewDiscountValue(50);
                    }}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      newDiscountType === 'percentage' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-100 text-gray-500'
                    }`}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDiscountType('fixed')}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      newDiscountType === 'fixed' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-100 text-gray-500'
                    }`}
                  >
                    Monto Fijo (Bs.)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">
                  VALOR DEL DESCUENTO {newDiscountType === 'percentage' ? '(%)' : '(Bs.)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={newDiscountType === 'percentage' ? 100 : undefined}
                  required
                  value={newDiscountValue}
                  onChange={e => setNewDiscountValue(Number(e.target.value))}
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                />
              </div>

              {/* Min Purchase & Expiration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">COMPRA MÍNIMA (Bs.)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMinPurchase}
                    onChange={e => setNewMinPurchase(Number(e.target.value))}
                    className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">FECHA EXPIRACIÓN</label>
                  <input
                    type="date"
                    required
                    value={newExpirationDate}
                    onChange={e => setNewExpirationDate(e.target.value)}
                    className="w-full bg-gray-55 p-3 rounded-xl text-sm font-semibold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                  />
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">LÍMITE TOTAL DE USOS</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newUsageLimit}
                  onChange={e => setNewUsageLimit(Number(e.target.value))}
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">DESCRIPCIÓN (OPCIONAL)</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Ej. Ahorra 10% en consumos superiores a 50 Bs."
                  rows={2}
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-semibold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-3.5 rounded-2xl font-bold text-gray-700 transition-colors text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3.5 rounded-2xl font-bold transition-colors shadow-md text-xs uppercase"
                >
                  Crear Cupón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-6 md:p-8 shadow-2xl border border-gray-100 flex flex-col my-8 animate-in zoom-in-95 text-center">
            <span className="text-[48px] mb-4 block">⚠️</span>
            <h2 className="text-[20px] font-black text-gray-800 mb-2">
              ¿Eliminar Cupón?
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              ¿Está seguro de que desea eliminar el cupón <strong className="text-gray-800 font-bold">"{couponToDelete.code}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-gray-700 transition-colors text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await cajaApi.deleteCoupon(couponToDelete.id);
                    setCoupons(prev => prev.filter(c => c.id !== couponToDelete.id));
                    setFeedback({
                      type: 'info',
                      title: 'Cupón Eliminado',
                      message: `El cupón "${couponToDelete.code}" ha sido eliminado con éxito.`
                    });
                  } catch (error) {
                    const err = error as Error;
                    setFeedback({
                      type: 'error',
                      title: 'Error al eliminar cupón',
                      message: err.message || 'No se pudo eliminar el cupón.'
                    });
                  } finally {
                    setCouponToDelete(null);
                  }
                }}
                className="flex-1 bg-alert hover:bg-red-650 text-white py-3 rounded-xl font-bold transition-colors shadow-md text-xs uppercase"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-6 md:p-8 shadow-2xl border border-gray-100 flex flex-col my-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-[20px] font-black text-gray-800">
                Editar Cupón
              </h2>
              <button 
                onClick={() => setEditingCoupon(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-250 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="space-y-4">
              {/* Promo Code */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">CÓDIGO DE CUPÓN</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={e => setEditCode(e.target.value)}
                  placeholder="Ej. DESCUENTOPATRIA"
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary uppercase"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">TIPO DE DESCUENTO</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditDiscountType('percentage');
                      if (editDiscountValue > 100) setEditDiscountValue(50);
                    }}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      editDiscountType === 'percentage' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-100 text-gray-500'
                    }`}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDiscountType('fixed')}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      editDiscountType === 'fixed' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-100 text-gray-500'
                    }`}
                  >
                    Monto Fijo (Bs.)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">
                  VALOR DEL DESCUENTO {editDiscountType === 'percentage' ? '(%)' : '(Bs.)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={editDiscountType === 'percentage' ? 100 : undefined}
                  required
                  value={editDiscountValue}
                  onChange={e => setEditDiscountValue(Number(e.target.value))}
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                />
              </div>

              {/* Min Purchase & Expiration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">COMPRA MÍNIMA (Bs.)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMinPurchase}
                    onChange={e => setEditMinPurchase(Number(e.target.value))}
                    className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">FECHA EXPIRACIÓN</label>
                  <input
                    type="date"
                    required
                    value={editExpirationDate}
                    onChange={e => setEditExpirationDate(e.target.value)}
                    className="w-full bg-gray-55 p-3 rounded-xl text-sm font-semibold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                  />
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">LÍMITE TOTAL DE USOS</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editUsageLimit}
                  onChange={e => setEditUsageLimit(Number(e.target.value))}
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-bold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">DESCRIPCIÓN (OPCIONAL)</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Ej. Ahorra 10% en consumos superiores a 50 Bs."
                  rows={2}
                  className="w-full bg-gray-55 p-3 rounded-xl text-sm font-semibold focus:ring-4 ring-primary/10 outline-none transition-all border border-gray-200 focus:border-primary resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-3.5 rounded-2xl font-bold text-gray-700 transition-colors text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3.5 rounded-2xl font-bold transition-colors shadow-md text-xs uppercase"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Coupon to Frequent Clients Modal */}
      {couponToSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-6 md:p-8 shadow-2xl border border-gray-100 flex flex-col my-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <div>
                <h2 className="text-[20px] font-black text-gray-800">
                  Enviar Cupón a Clientes Frecuentes
                </h2>
                <p className="text-[12px] text-gray-500 mt-1">
                  Enviar código <span className="font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded text-primary">{couponToSend.code}</span>
                </p>
              </div>
              <button 
                onClick={() => setCouponToSend(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-250 flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {isLoadingClients ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 font-semibold">Buscando clientes elegibles (&gt; 5 compras)...</p>
              </div>
            ) : allClients.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-[40px] block mb-2">👥</span>
                <p className="font-semibold text-gray-750">Sin Clientes Elegibles</p>
                <p className="text-gray-400 text-[13px] mt-1">
                  Actualmente no hay usuarios registrados con correo electrónico en el sistema.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setCouponToSend(null)}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-250 rounded-xl font-bold text-gray-700 transition-colors text-xs uppercase"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <p className="text-xs text-orange-800 leading-relaxed">
                    Selecciona los destinatarios que recibirán el correo electrónico con el cupón, valor de descuento y términos de uso.
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-150 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('frequent');
                      const frequent = allClients.filter(c => c.purchasesCount > 5);
                      setSelectedClients(frequent.map(c => c.id));
                    }}
                    className={`flex-1 pb-3 text-center transition-colors border-b-2 ${
                      activeTab === 'frequent' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Clientes Frecuentes ({allClients.filter(c => c.purchasesCount > 5).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      setSelectedClients([]);
                    }}
                    className={`flex-1 pb-3 text-center transition-colors border-b-2 ${
                      activeTab === 'all' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Todos los Clientes ({allClients.length})
                  </button>
                </div>

                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-150 rounded-2xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={visibleClients.length > 0 && visibleClients.every(client => selectedClients.includes(client.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 accent-primary border-gray-300 rounded cursor-pointer"
                    />
                    Seleccionar Visibles
                  </label>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                    {selectedClients.filter(id => visibleClients.some(vc => vc.id === id)).length} / {visibleClients.length} Seleccionados
                  </span>
                </div>

                <div className="max-h-[220px] overflow-y-auto border border-gray-100 rounded-[2rem] p-2 space-y-1.5 bg-gray-50/50">
                  {visibleClients.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-xs font-semibold">
                      No hay clientes en esta categoría.
                    </p>
                  ) : (
                    visibleClients.map((client) => {
                      const isSelected = selectedClients.includes(client.id);
                      return (
                        <div 
                          key={client.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isSelected ? 'bg-orange-50/20 border-orange-100' : 'bg-white border-gray-100'
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectClient(client.id)}
                              className="w-4 h-4 accent-primary border-gray-300 rounded cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-800">{client.name}</p>
                              <p className="text-[10px] text-gray-400">{client.email}</p>
                            </div>
                          </label>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            client.purchasesCount > 5 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {client.purchasesCount > 5 ? '⭐' : '👤'} {client.purchasesCount} compras
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCouponToSend(null)}
                    disabled={isSendingEmails}
                    className="flex-1 bg-gray-100 hover:bg-gray-250 py-3.5 rounded-2xl font-bold text-gray-700 transition-colors text-xs uppercase disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCoupon}
                    disabled={isSendingEmails}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl font-bold transition-all shadow-md text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
                  >
                    {isSendingEmails ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </>
                    ) : (
                      <>✉️ Enviar ({selectedClients.length})</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Alert Modal */}
      <FeedbackModal 
        open={Boolean(feedback)} 
        title={feedback?.title || ''} 
        message={feedback?.message || ''} 
        type={feedback?.type || 'info'} 
        onClose={() => setFeedback(null)} 
      />
    </main>
  );
}
