import { clientFlowApi } from '../../shared/api/client-flow.api';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import { ordersApi } from '../../shared/api/orders.api';
import { requestBillForTableMock } from '../../shared/mocks/table-orders.mock';
import { menuApi } from '../menu/menu.api';
import { mapProductFromBackend } from '../../shared/mappers/menu.mapper';
import type { BackendProduct } from '../../shared/mappers/menu.mapper';
import { RESTAURANT_STATE_CHANGED_EVENT } from '../../shared/utils/events';
import { getTableByIdMock } from '../../shared/mocks/tables.mock';
import { getMockIngredientsForProduct } from '../../shared/mocks/menu-ingredients.mock';
import { pusherClient } from '../../shared/utils/pusher';
import type { AuthUser } from '../auth/types/auth.types';
import type { RestaurantTable } from '../tables/types/table.types';
import type {
  AddOrderItemPayload,
  OrderCatalogCategory,
  OrderCatalogProduct,
  TableOrder,
  TableOrderItem,
  TableOrderStatus,
} from '../tables/types/table-order.types';

type FlowStep = 'cliente' | 'menu' | 'pedido';

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type IngredientSelection = {
  id: number;
  nombre: string;
  incluido: boolean;
  incluidoPorDefecto: boolean;
};

type PusherTableOrderUpdatedEvent = {
  id_mesa?: number | string;
  tableId?: number | string;
  id_pedido?: number | string;
  orderId?: number | string;
  estado?: string;
};

interface MeseroOrderFlowPageProps {
  user: AuthUser;
  tableId: number;
  onBack: () => void;
  onOpenOrders?: () => void;
}

function formatCurrency(value: number | string | null | undefined) {
  return `Bs ${Number(value ?? 0).toFixed(2)}`;
}

function getOrderStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO': return 'Registrado';
    case 'EN_PREPARACION': return 'En preparación';
    case 'LISTO': return 'Listo para entregar';
    case 'EN_CAMINO': return 'En camino';
    case 'ENTREGADO': return 'Pedido completado';
    case 'PAGADO': return 'Pagado';
    case 'CANCELADO': return 'Cancelado';
  }
}

function getTableStatusLabel(status: RestaurantTable['estado']) {
  switch (status) {
    case 'LIBRE': return 'Libre';
    case 'OCUPADA': return 'Ocupada';
    case 'RESERVADA': return 'Reservada';
    case 'CUENTA_SOLICITADA': return 'Cuenta solicitada';
    case 'FUERA_DE_SERVICIO': return 'Fuera de servicio';
  }
}

function getStatusBadgeClass(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO': return 'bg-process/10 text-process';
    case 'EN_PREPARACION': return 'bg-alert/10 text-alert';
    case 'LISTO':
    case 'EN_CAMINO': return 'bg-info/10 text-info';
    case 'ENTREGADO':
    case 'PAGADO': return 'bg-success/10 text-success';
    case 'CANCELADO': return 'bg-gray-200 text-gray-600';
  }
}

function getItemIcon(categoryId: number) {
  switch (categoryId) {
    case 1: return '🥗';
    case 2: return '🍽️';
    case 3: return '🥤';
    case 4: return '🍰';
    default: return '🍴';
  }
}

function buildDefaultIngredients(product: OrderCatalogProduct | null): IngredientSelection[] {
  if (!product) return [];
  const backendIngredients = product.ingredientes ?? [];
  if (backendIngredients.length > 0) {
    return backendIngredients.map((ingredient) => ({
      id: ingredient.id,
      nombre: ingredient.nombre,
      incluido: ingredient.incluidoPorDefecto,
      incluidoPorDefecto: ingredient.incluidoPorDefecto,
    }));
  }
  return getMockIngredientsForProduct(product.nombre).map((ingredient) => ({
    id: ingredient.id,
    nombre: ingredient.nombre,
    incluido: ingredient.incluidoPorDefecto,
    incluidoPorDefecto: ingredient.incluidoPorDefecto,
  }));
}

function getRemovedIngredients(item: TableOrderItem) {
  return (item.ingredientes ?? []).filter((ingredient) => !ingredient.incluido);
}

export default function MeseroOrderFlowPage({
  user,
  tableId,
  onBack,
  onOpenOrders,
}: MeseroOrderFlowPageProps) {
  const [activeStep, setActiveStep] = useState<FlowStep>('cliente');
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [activeOrders, setActiveOrders] = useState<TableOrder[]>([]);
  const [categories, setCategories] = useState<OrderCatalogCategory[]>([]);
  const [products, setProducts] = useState<OrderCatalogProduct[]>([]);
  const [customerCi, setCustomerCi] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFound, setCustomerFound] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  const [ingredientSelections, setIngredientSelections] = useState<IngredientSelection[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const skipNextIngredientHydration = useRef(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const isBillRequested = table?.estado === 'CUENTA_SOLICITADA';
  const canEditItems = Boolean(order) && !isBillRequested && order?.estado === 'REGISTRADO';
  const canSaveCustomer = table?.estado !== 'FUERA_DE_SERVICIO' && !isBillRequested;
  const hasItems = (order?.items?.length ?? 0) > 0;

  const refreshTable = useCallback(async () => {
    const latestTable = await getTableByIdMock(tableId);
    setTable(latestTable);
    return latestTable;
  }, [tableId]);

  const refreshOrders = useCallback(async (preferredOrderId?: number) => {
    const ordersData = await ordersApi.getOpenOrdersByTable(tableId);
    setActiveOrders(ordersData);
    if (ordersData.length > 0) {
      setOrder((currentOrder) => {
        const preferredOrder = typeof preferredOrderId === 'number'
          ? ordersData.find((activeOrder) => activeOrder.id === preferredOrderId)
          : null;
        if (preferredOrder) return preferredOrder;
        const stillActive = ordersData.find((activeOrder) => activeOrder.id === currentOrder?.id);
        return stillActive ?? ordersData.find((activeOrder) => activeOrder.estado === 'REGISTRADO') ?? ordersData[0];
      });
    } else {
      setOrder(null);
    }
    return ordersData;
  }, [tableId]);

  const refreshPageState = useCallback(async (preferredOrderId?: number) => {
    await Promise.all([refreshOrders(preferredOrderId), refreshTable()]);
  }, [refreshOrders, refreshTable]);

  const resetItemForm = useCallback(() => {
    setEditingItemId(null);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  }, [selectedProduct]);

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      try {
        const [tableData, categoriesData, ordersData] = await Promise.all([
          refreshTable(),
          menuApi.getCategories('', 'activas'),
          ordersApi.getOpenOrdersByTable(tableId),
        ]);

        setCategories(categoriesData);
        setActiveOrders(ordersData);

        if (categoriesData.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(categoriesData[0].id);
        }

        const currentOrder = ordersData.find((o) => o.estado === 'REGISTRADO') ?? ordersData[0] ?? null;
        setOrder(currentOrder);

        if (currentOrder) {
          setCustomerName(currentOrder.customer.nombre);
          setCustomerEmail(currentOrder.customer.telefono || '');
          setCustomerCi(currentOrder.customer.ci === '0' ? '' : currentOrder.customer.ci);
          setCustomerFound(Boolean(currentOrder.customer.idUsuario));
          setSelectedCustomerId(currentOrder.customer.idUsuario ?? null);
          setActiveStep(currentOrder.items.length > 0 ? 'pedido' : 'menu');
        } else if (tableData.estado === 'RESERVADA') {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const res = await fetch(`${API_URL}/api/reservas/mesa/${tableId}`);
          
          if (res.ok) {
            const reservation = await res.json();
            if (reservation.id_usuario_cliente) {
              const clientRes = await fetch(`${API_URL}/api/clientes/ci/${reservation.usuario_ci}`);
              if (clientRes.ok) {
                const client = await clientRes.json();
                setCustomerName(`${client.nombre} ${client.apellido}`);
                setCustomerEmail(client.correo_electronico || client.correo || '');
                setCustomerCi(client.usuario_ci?.toString() || reservation.usuario_ci?.toString());
                setCustomerFound(true);
                setSelectedCustomerId(client.id_usuario);
              }
            } else if (reservation.observaciones?.includes('INVITADO')) {
              const obs = reservation.observaciones as string;
              const nameMatch = obs.match(/INVITADO:\s*([^|]+)/);
              const ciMatch = obs.match(/CI:\s*([^|]+)/);
              const mailMatch = obs.match(/Correo:\s*([^|]+)/) || obs.match(/Tel:\s*([^|]+)/);

              setCustomerName(nameMatch?.[1].trim() || 'Invitado');
              setCustomerCi(ciMatch?.[1].trim() || '');
              setCustomerEmail(mailMatch?.[1].trim() || '');
              setCustomerFound(true);
            }
          }
          setActiveStep('cliente');
        }
      } catch {
        setFeedback({ type: 'error', title: 'Error', message: 'Error de sincronización.' });
      } finally {
        setIsLoading(false);
      }
    };
    void loadPage();
  }, [tableId, refreshTable, selectedCategoryId]);

  useEffect(() => {
    const handleStateChange = () => { void refreshPageState(); };
    window.addEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange);
    return () => { window.removeEventListener(RESTAURANT_STATE_CHANGED_EVENT, handleStateChange); };
  }, [refreshPageState]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedCategoryId) return;
      try {
        const raw = await menuApi.getProductos();
        const mapped = (raw as BackendProduct[])
          .map(mapProductFromBackend)
          .filter((p) => p.categoryId === selectedCategoryId && p.disponible);
        setProducts(mapped as unknown as OrderCatalogProduct[]);
      } catch {
        setFeedback({ type: 'error', title: 'Error', message: 'Error al cargar menú.' });
      }
    };
    void loadProducts();
  }, [selectedCategoryId]);

  useEffect(() => {
    if (skipNextIngredientHydration.current) {
      skipNextIngredientHydration.current = false;
      return;
    }
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  }, [selectedProduct]);

  useEffect(() => {
    const channel = pusherClient.subscribe('tables-channel');
    channel.bind('table-order-updated', (updatedOrder: PusherTableOrderUpdatedEvent) => {
      if (Number(updatedOrder.id_mesa ?? updatedOrder.tableId) === tableId) {
        refreshPageState(Number(updatedOrder.id_pedido ?? updatedOrder.orderId));
      }
    });
    return () => {
      channel.unbind('table-order-updated');
      pusherClient.unsubscribe('tables-channel');
    };
  }, [tableId, refreshPageState]);

  const handleSearchCustomer = async () => {
    if (!customerCi.trim()) return;
    setIsSearchingCustomer(true);
    try {
      const foundCustomer = await clientFlowApi.findClientByCI(customerCi);
      if (!foundCustomer) {
        setCustomerFound(false);
        setSelectedCustomerId(null);
        setFeedback({ type: 'info', title: 'Aviso', message: 'CI no encontrado. Ingrese datos manualmente.' });
        return;
      }
      setCustomerName(`${foundCustomer.nombre} ${foundCustomer.apellido}`);
      setCustomerEmail(foundCustomer.correo);
      setCustomerFound(true);
      setSelectedCustomerId(Number(foundCustomer.id.replace('u-', '')));
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'Error en la búsqueda.' });
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);
    try {
      const savedOrder = await ordersApi.saveOrderCustomer(tableId, {
        nombre: customerName,
        telefono: customerEmail,
        ci: customerCi,
        idUsuario: customerFound ? selectedCustomerId : null,
      }, user.id);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/api/mesas/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'OCUPADA' })
      });
      await refreshPageState(savedOrder.id);
      setActiveStep('menu');
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'No se pudo abrir el pedido.' });
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSaveItem = async () => {
    setIsSavingItem(true);
    try {
      const payload: AddOrderItemPayload = {
        categoriaId: selectedCategoryId,
        productoId: selectedProductId,
        presentacionId: selectedProduct?.presentacionId || 0,
        cantidad: Number(quantity),
        observacion: observation,
        ingredientes: ingredientSelections.map(i => ({ nombre: i.nombre, incluido: i.incluido })),
      };

      const updatedOrder = editingItemId
        ? await ordersApi.updateOrderItem(tableId, editingItemId, payload, order?.id)
        : await ordersApi.addOrderItem(tableId, payload, order?.id);

      await refreshPageState(updatedOrder.id);
      setIsItemModalOpen(false);
      resetItemForm();
      setActiveStep('pedido');
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'Error al guardar item.' });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleChangeOrderStatus = async (status: TableOrderStatus) => {
    setIsChangingStatus(true);
    try {
      await ordersApi.updateOrderStatus(order?.id || 0, status, tableId);
      await refreshPageState(order?.id);
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'Error al actualizar estado.' });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleRequestBill = async () => {
    setIsRequestingBill(true);
    try {
      await requestBillForTableMock(tableId);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/api/mesas/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'CUENTA_SOLICITADA' })
      });
      await refreshPageState();
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'Error al pedir cuenta.' });
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleToggleIngredient = (id: number) => {
    setIngredientSelections(prev => prev.map(i => i.id === id ? { ...i, incluido: !i.incluido } : i));
  };

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="text-[28px]">☰</button>
          {onOpenOrders && (
            <button onClick={onOpenOrders} className="rounded-full bg-white px-4 py-2 text-[12px] font-bold text-primary shadow-sm">
              Mis pedidos
            </button>
          )}
        </div>

        <header className="mb-4">
          <h1 className="text-title font-bold text-text">Gestionar pedido</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            {table ? `Mesa ${table.numero} · ${getTableStatusLabel(table.estado)}` : 'Cargando...'}
          </p>
        </header>

        {!isLoading && (
          <>
            <nav className="mb-4 flex gap-1 rounded-2xl bg-white/60 p-1 shadow-sm w-max">
              {(['cliente', 'menu', 'pedido'] as const).map((step) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`rounded-xl px-4 py-2 text-[12px] font-bold capitalize ${activeStep === step ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                >
                  {step === 'menu' ? 'Menú' : step}
                </button>
              ))}
            </nav>

            {activeStep === 'cliente' && (
              <section className="rounded-[1.5rem] bg-white p-6 shadow-sm max-w-xl">
                <h2 className="text-[20px] font-bold text-text">Confirmar Cliente</h2>
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">CI / NIT</label>
                      <input
                        type="text"
                        value={customerCi}
                        onChange={(e) => { setCustomerCi(e.target.value); setCustomerFound(false); }}
                        disabled={customerFound}
                        className="rounded-xl border p-3 text-[14px] outline-none disabled:bg-gray-100"
                        placeholder="Ej. 9485624"
                      />
                    </div>
                    {!customerFound && (
                      <button
                        onClick={() => void handleSearchCustomer()}
                        disabled={isSearchingCustomer || !canSaveCustomer}
                        className="mt-[28px] rounded-xl bg-primary px-6 text-white font-bold"
                      >
                        {isSearchingCustomer ? '...' : 'Buscar'}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">Nombre completo</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={customerFound}
                      className="rounded-xl border p-3 text-[14px] outline-none disabled:bg-gray-100"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">Correo electrónico</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      disabled={customerFound}
                      className="rounded-xl border p-3 text-[14px] outline-none focus:border-primary disabled:bg-gray-100"
                    />
                  </div>

                  <button
                    onClick={() => void handleSaveCustomer()}
                    disabled={isSavingCustomer || !canSaveCustomer || !customerName}
                    className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow-md transition-transform active:scale-95"
                  >
                    {isSavingCustomer ? 'Abriendo pedido...' : order ? 'Actualizar datos' : 'Confirmar y Abrir pedido'}
                  </button>
                </div>
              </section>
            )}

            {activeStep === 'menu' && (
              <section className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold shrink-0 ${selectedCategoryId === c.id ? 'bg-primary text-white' : 'bg-white shadow-sm'}`}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <article key={p.id} className="rounded-2xl bg-white p-4 shadow-sm flex flex-col justify-between">
                      <div className="flex gap-3">
                        <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center text-xl">
                          {getItemIcon(p.categoryId)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[15px] font-bold text-text">{p.nombre}</h3>
                          <p className="text-[13px] font-bold text-primary mt-1">{formatCurrency(p.precio)}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedProductId(p.id); setIsItemModalOpen(true); }}
                          disabled={!canEditItems}
                          className="h-10 w-10 rounded-full bg-primary text-white text-xl font-bold"
                        >+</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeStep === 'pedido' && order && (
              <section className="space-y-4 max-w-xl mx-auto">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[20px] font-bold text-text">Resumen</h2>
                    <span className={getStatusBadgeClass(order.estado) + " px-3 py-1 rounded-full text-[11px] font-bold"}>
                      {getOrderStatusLabel(order.estado)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeOrders.map((o, idx) => (
                      <button key={o.id} onClick={() => setOrder(o)} className={`rounded-lg px-3 py-1 text-[11px] font-bold ${order.id === o.id ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                        Pedido #{idx + 1}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-[14px]">
                        <div>
                          <span>{item.cantidad}x {item.nombreProducto}</span>
                          {getRemovedIngredients(item).map(ing => (
                            <span key={ing.nombre} className="block text-[10px] text-alert">Sin {ing.nombre}</span>
                          ))}
                        </div>
                        <span className="font-bold text-text">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-3 flex justify-between items-center text-[20px] font-bold text-primary">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {order.estado === 'REGISTRADO' && (
                    <button
                      onClick={() => void handleChangeOrderStatus('EN_PREPARACION')}
                      disabled={isChangingStatus || !hasItems}
                      className="w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg"
                    >Enviar a cocina</button>
                  )}
                  {order.estado === 'ENTREGADO' && (
                    <button
                      onClick={() => void handleRequestBill()}
                      disabled={isRequestingBill}
                      className="w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg"
                    >Solicitar cuenta</button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-text">{editingItemId ? 'Editar' : 'Agregar'}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-text">Cantidad</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 border rounded-lg p-2 text-center" />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {ingredientSelections.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className={`text-sm ${i.incluido ? 'text-text' : 'text-gray-400 line-through'}`}>{i.nombre}</span>
                    <button onClick={() => handleToggleIngredient(i.id)} className={`w-10 h-6 rounded-full relative ${i.incluido ? 'bg-success' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${i.incluido ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => { setIsItemModalOpen(false); resetItemForm(); }} className="border p-3 rounded-xl font-bold text-text">Cancelar</button>
                <button onClick={() => void handleSaveItem()} disabled={isSavingItem} className="bg-primary text-white p-3 rounded-xl font-bold">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal
        open={Boolean(feedback)}
        title={feedback?.title ?? ''}
        message={feedback?.message ?? ''}
        type={feedback?.type ?? 'info'}
        onClose={() => setFeedback(null)}
      />
    </main>
  );
}