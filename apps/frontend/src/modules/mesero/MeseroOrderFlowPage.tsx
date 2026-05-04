import { useEffect, useMemo, useRef, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import {
  addOrderItemToTableMock,
  getOpenOrderByTableMock,
  listOrderCategoriesMock,
  listOrderProductsByCategoryMock,
  removeOrderItemFromTableMock,
  requestBillForTableMock,
  saveOrderCustomerMock,
  searchOrderCustomerByCiMock,
  updateOrderItemInTableMock,
  updateOrderStatusForTableMock,
} from '../../shared/mocks/table-orders.mock';
import { getTableByIdMock, updateTableStatusMock } from '../../shared/mocks/tables.mock';
import type { AuthUser } from '../auth/types/auth.types';
import type { RestaurantTable } from '../tables/types/table.types';
import type {
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

interface MeseroOrderFlowPageProps {
  user: AuthUser;
  tableId: number;
  onBack: () => void;
  onOpenOrders: () => void;
}

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function getOrderStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'Registrado';
    case 'EN_PREPARACION':
      return 'En preparación';
    case 'LISTO':
      return 'Listo para entregar';
    case 'EN_CAMINO':
      return 'En camino';
    case 'ENTREGADO':
      return 'Pedido completado';
    case 'PAGADO':
      return 'Pagado';
    case 'CANCELADO':
      return 'Cancelado';
  }
}

function getTableStatusLabel(status: RestaurantTable['estado']) {
  switch (status) {
    case 'LIBRE':
      return 'Libre';
    case 'OCUPADA':
      return 'Ocupada';
    case 'RESERVADA':
      return 'Reservada';
    case 'CUENTA_SOLICITADA':
      return 'Cuenta solicitada';
    case 'FUERA_DE_SERVICIO':
      return 'Fuera de servicio';
  }
}

function getStatusBadgeClass(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'bg-process/10 text-process';
    case 'EN_PREPARACION':
      return 'bg-alert/10 text-alert';
    case 'LISTO':
    case 'EN_CAMINO':
      return 'bg-info/10 text-info';
    case 'ENTREGADO':
    case 'PAGADO':
      return 'bg-success/10 text-success';
    case 'CANCELADO':
      return 'bg-gray-200 text-gray-600';
  }
}

function getItemIcon(categoryId: number) {
  switch (categoryId) {
    case 1:
      return '🥗';
    case 2:
      return '🍽️';
    case 3:
      return '🥤';
    case 4:
      return '🍰';
    default:
      return '🍴';
  }
}

function buildDefaultIngredients(product: OrderCatalogProduct | null): IngredientSelection[] {
  if (!product) return [];

  return product.ingredientes.map((ingredient) => ({
    id: ingredient.id,
    nombre: ingredient.nombre,
    incluido: ingredient.incluidoPorDefecto,
    incluidoPorDefecto: ingredient.incluidoPorDefecto,
  }));
}

function getRemovedIngredients(item: TableOrderItem) {
  return item.ingredientes.filter((ingredient) => !ingredient.incluido);
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
  const [categories, setCategories] = useState<OrderCatalogCategory[]>([]);
  const [products, setProducts] = useState<OrderCatalogProduct[]>([]);

  const [customerCi, setCustomerCi] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerFound, setCustomerFound] = useState(false);

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
  const canEditItems =
    Boolean(order) &&
    !isBillRequested &&
    (order?.estado === 'REGISTRADO' || order?.estado === 'EN_PREPARACION');
  const canSaveCustomer = table?.estado !== 'FUERA_DE_SERVICIO' && !isBillRequested;
  const hasItems = (order?.items.length ?? 0) > 0;
  const removedFromCurrentSelection = ingredientSelections.filter(
    (ingredient) => !ingredient.incluido
  );
  const hasCustomIngredients = ingredientSelections.some(
    (ingredient) => ingredient.incluido !== ingredient.incluidoPorDefecto
  );

  const orderFlow = [
    {
      label: 'Pedido',
      done: Boolean(order),
      active: !order,
    },
    {
      label: 'Cocina',
      done:
        order?.estado === 'EN_PREPARACION' ||
        order?.estado === 'LISTO' ||
        order?.estado === 'EN_CAMINO' ||
        order?.estado === 'ENTREGADO' ||
        isBillRequested,
      active: order?.estado === 'REGISTRADO' && hasItems,
    },
    {
      label: 'Entrega',
      done: order?.estado === 'ENTREGADO' || isBillRequested,
      active: order?.estado === 'LISTO' || order?.estado === 'EN_CAMINO',
    },
    {
      label: 'Cuenta',
      done: Boolean(isBillRequested),
      active: order?.estado === 'ENTREGADO' && !isBillRequested,
    },
  ];

  const refreshOrder = async () => {
    const latestOrder = await getOpenOrderByTableMock(tableId);
    setOrder(latestOrder);

    if (latestOrder) {
      setCustomerName(latestOrder.customer.nombre);
      setCustomerPhone(latestOrder.customer.telefono);
      setCustomerCi(latestOrder.customer.ci === '0' ? '' : latestOrder.customer.ci);
      setCustomerFound(Boolean(latestOrder.customer.idUsuario));
    }
  };

  const refreshTable = async () => {
    const latestTable = await getTableByIdMock(tableId);
    setTable(latestTable);
  };

  const refreshPageState = async () => {
    await Promise.all([refreshOrder(), refreshTable()]);
  };

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);

      try {
        const [tableData, categoriesData, orderData] = await Promise.all([
          getTableByIdMock(tableId),
          listOrderCategoriesMock(),
          getOpenOrderByTableMock(tableId),
        ]);

        setTable(tableData);
        setCategories(categoriesData);
        setOrder(orderData);
        setSelectedCategoryId(categoriesData[0]?.id ?? 0);

        if (orderData) {
          setCustomerName(orderData.customer.nombre);
          setCustomerPhone(orderData.customer.telefono);
          setCustomerCi(orderData.customer.ci === '0' ? '' : orderData.customer.ci);
          setCustomerFound(Boolean(orderData.customer.idUsuario));
          setActiveStep(orderData.items.length > 0 ? 'pedido' : 'menu');
        } else {
          setCustomerName('');
          setCustomerPhone('');
          setCustomerCi('');
          setActiveStep('cliente');
        }
      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'No se pudo cargar',
          message:
            error instanceof Error
              ? error.message
              : 'Ocurrió un error al cargar el flujo de mesero',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadPage();
  }, [tableId]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedCategoryId) {
        setProducts([]);
        setSelectedProductId(0);
        return;
      }

      try {
        const categoryProducts = await listOrderProductsByCategoryMock(selectedCategoryId);
        setProducts(categoryProducts);
        setSelectedProductId((currentProductId) =>
          categoryProducts.some((product) => product.id === currentProductId)
            ? currentProductId
            : categoryProducts[0]?.id ?? 0
        );
      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'No se pudieron cargar productos',
          message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
        });
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

  const resetItemForm = () => {
    setEditingItemId(null);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  };

  const openProductModal = (product: OrderCatalogProduct) => {
    setSelectedCategoryId(product.categoryId);
    setSelectedProductId(product.id);
    setEditingItemId(null);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(product));
    setIsItemModalOpen(true);
  };

  const handleSearchCustomer = async () => {
    if (!customerCi.trim()) {
      setFeedback({
        type: 'info',
        title: 'Ingresa un CI',
        message: 'Escribe el CI del cliente para buscarlo en los datos mockeados.',
      });
      return;
    }

    setIsSearchingCustomer(true);

    try {
      const foundCustomer = await searchOrderCustomerByCiMock(customerCi);

      if (!foundCustomer) {
        setCustomerFound(false);
        setFeedback({
          type: 'info',
          title: 'Cliente no encontrado',
          message: 'Puedes continuar como cliente no registrado y completar una referencia manual.',
        });
        return;
      }

      setCustomerName(foundCustomer.nombre);
      setCustomerPhone(foundCustomer.telefono);
      setCustomerCi(foundCustomer.ci);
      setCustomerFound(true);
      setFeedback({
        type: 'success',
        title: 'Cliente encontrado',
        message: 'Los datos del cliente se completaron automáticamente.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo buscar',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleUseUnregisteredCustomer = () => {
    setCustomerFound(false);
    setCustomerCi('');
    setCustomerPhone('00000000');
    setCustomerName(table ? `Cliente no registrado - mesa ${table.numero}` : 'Cliente no registrado');
  };

  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);

    try {
      await saveOrderCustomerMock(tableId, {
        nombre: customerName,
        telefono: customerPhone,
        ci: customerCi,
        idUsuario: customerFound ? undefined : null,
      });
      await updateTableStatusMock(tableId, 'OCUPADA');
      await refreshPageState();
      setActiveStep('menu');
      setFeedback({
        type: 'success',
        title: order ? 'Cliente actualizado' : 'Pedido abierto',
        message: order
          ? 'Los datos del pedido se actualizaron correctamente.'
          : 'La mesa quedó ocupada y ya puedes agregar productos.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo guardar',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSaveItem = async () => {
    setIsSavingItem(true);

    try {
      const payload = {
        categoriaId: selectedCategoryId,
        productoId: selectedProductId,
        cantidad: Number(quantity),
        observacion: observation,
        ingredientes: ingredientSelections.map((ingredient) => ({
          nombre: ingredient.nombre,
          incluido: ingredient.incluido,
        })),
      };

      if (editingItemId) {
        await updateOrderItemInTableMock(tableId, editingItemId, payload);
      } else {
        await addOrderItemToTableMock(tableId, payload);
      }

      await updateTableStatusMock(tableId, 'OCUPADA');
      await refreshPageState();
      resetItemForm();
      setIsItemModalOpen(false);
      setActiveStep('pedido');
      setFeedback({
        type: 'success',
        title: editingItemId ? 'Item actualizado' : 'Item agregado',
        message: editingItemId
          ? 'El item se actualizó correctamente.'
          : 'El producto se agregó al pedido actual.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: editingItemId ? 'No se pudo actualizar' : 'No se pudo agregar',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleStartEditItem = (item: TableOrderItem) => {
    skipNextIngredientHydration.current =
      selectedCategoryId !== item.categoriaId || selectedProductId !== item.productoId;
    setEditingItemId(item.id);
    setSelectedCategoryId(item.categoriaId);
    setSelectedProductId(item.productoId);
    setQuantity(String(item.cantidad));
    setObservation(item.observacion);
    setIngredientSelections(
      item.ingredientes.map((ingredient, index) => ({
        id: index + 1,
        nombre: ingredient.nombre,
        incluido: ingredient.incluido,
        incluidoPorDefecto: ingredient.incluido,
      }))
    );
    setIsItemModalOpen(true);
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeOrderItemFromTableMock(tableId, itemId);
      await refreshOrder();
      setFeedback({
        type: 'success',
        title: 'Item eliminado',
        message: 'El item se quitó del pedido actual.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo eliminar',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    }
  };

  const handleChangeOrderStatus = async (status: TableOrderStatus) => {
    setIsChangingStatus(true);

    try {
      await updateOrderStatusForTableMock(tableId, status);

      if (status === 'ENTREGADO') {
        await updateTableStatusMock(tableId, 'OCUPADA');
      }

      await refreshPageState();
      setActiveStep('pedido');
      setFeedback({
        type: 'success',
        title: 'Estado actualizado',
        message: `El pedido ahora está ${getOrderStatusLabel(status).toLowerCase()}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo cambiar estado',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleRequestBill = async () => {
    setIsRequestingBill(true);

    try {
      await requestBillForTableMock(tableId);
      await updateTableStatusMock(tableId, 'CUENTA_SOLICITADA');
      await refreshPageState();
      setFeedback({
        type: 'success',
        title: 'Cuenta solicitada',
        message: 'La mesa quedó en cuenta solicitada y lista para caja.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo solicitar cuenta',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleToggleIngredient = (ingredientId: number) => {
    setIngredientSelections((current) =>
      current.map((ingredient) =>
        ingredient.id === ingredientId
          ? { ...ingredient, incluido: !ingredient.incluido }
          : ingredient
      )
    );
  };

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-text md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[430px] md:max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-[28px] leading-none text-text"
            aria-label="Volver a mesas"
          >
            ☰
          </button>

          <button
            type="button"
            onClick={onOpenOrders}
            className="rounded-full bg-white px-4 py-2 text-[12px] font-bold text-primary shadow-sm"
          >
            Mis pedidos
          </button>
        </div>

        <header className="mb-4">
          <h1 className="text-title font-bold text-text">Gestionar pedido</h1>
          <p className="mt-1 text-[13px] leading-5 text-gray-500">
            {table
              ? `Mesa ${table.numero} · ${getTableStatusLabel(table.estado)} · Mesero ${user.nombre}`
              : 'Flujo operativo del mesero'}
          </p>
        </header>

        {isLoading ? (
          <div className="rounded-[1.5rem] bg-white p-5 text-[14px] text-gray-500 shadow-sm">
            Cargando flujo...
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-white/60 p-1 shadow-sm md:w-max">
              <div className="grid grid-cols-3 gap-1 md:flex md:gap-2">
                {(['cliente', 'menu', 'pedido'] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(step)}
                    className={`rounded-xl px-3 py-2 text-[12px] font-bold capitalize transition-colors md:px-6 ${
                      activeStep === step
                        ? 'bg-white text-text shadow-sm'
                        : 'text-gray-500 hover:bg-white/60'
                    }`}
                  >
                    {step === 'menu' ? 'Menú' : step}
                  </button>
                ))}
              </div>
            </div>

            {activeStep === 'cliente' && (
              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm md:max-w-xl">
                <h2 className="text-[20px] font-bold text-text">Cliente del pedido</h2>
                <p className="mt-1 text-[13px] leading-5 text-gray-500">
                  Busca por CI para autocompletar datos. Si no está registrado, continúa con una referencia manual.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">CI del cliente</label>
                      <input
                        type="text"
                        value={customerCi}
                        onChange={(event) => {
                          setCustomerCi(event.target.value);
                          setCustomerFound(false);
                        }}
                        placeholder="Ej. 5678123"
                        disabled={!canSaveCustomer}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] outline-none focus:border-primary disabled:opacity-60"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSearchCustomer()}
                      disabled={isSearchingCustomer || !canSaveCustomer}
                      className="mt-[28px] rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60"
                    >
                      {isSearchingCustomer ? '...' : 'Buscar'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseUnregisteredCustomer}
                    disabled={!canSaveCustomer}
                    className="w-full rounded-xl border border-primary px-4 py-3 text-[13px] font-bold text-primary disabled:opacity-60"
                  >
                    Cliente no registrado
                  </button>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">Nombre / referencia</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Nombre del cliente o referencia de mesa"
                      disabled={!canSaveCustomer}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] outline-none focus:border-primary disabled:opacity-60"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">Teléfono</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      placeholder="Opcional"
                      disabled={!canSaveCustomer}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] outline-none focus:border-primary disabled:opacity-60"
                    />
                  </div>

                  <div className="rounded-2xl bg-background px-4 py-3 text-[12px] font-medium text-gray-500">
                    {customerFound
                      ? 'Cliente encontrado en datos mock. Luego backend puede reemplazar esta búsqueda por usuarios.usuario_ci.'
                      : 'Sin cliente registrado seleccionado. Se enviará como pedido de mesa con cliente opcional.'}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveCustomer()}
                    disabled={isSavingCustomer || !canSaveCustomer}
                    className="w-full rounded-xl bg-primary px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                  >
                    {isSavingCustomer
                      ? 'Guardando...'
                      : order
                      ? 'Actualizar y continuar'
                      : 'Abrir pedido'}
                  </button>
                </div>
              </section>
            )}

            {activeStep === 'menu' && (
              <section className="space-y-4">
                {!order && (
                  <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-sm">
                    <p className="text-[15px] font-bold text-text">Primero abre el pedido</p>
                    <p className="mt-2 text-[13px] leading-5 text-gray-500">
                      Guarda el cliente o marca cliente no registrado para habilitar la toma de pedido.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveStep('cliente')}
                      className="mt-4 rounded-xl bg-primary px-5 py-3 text-[13px] font-bold text-white"
                    >
                      Ir a cliente
                    </button>
                  </div>
                )}

                {order && (
                  <>
                    <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-[20px] font-bold text-text">Categorías</h2>
                          <p className="mt-1 text-[12px] text-gray-500">Selecciona para filtrar productos.</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusBadgeClass(order.estado)}`}>
                          {getOrderStatusLabel(order.estado)}
                        </span>
                      </div>

                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`shrink-0 rounded-xl px-4 py-3 text-[12px] font-bold ${
                              selectedCategoryId === category.id
                                ? 'bg-primary text-white'
                                : 'bg-background text-text'
                            }`}
                          >
                            {category.nombre}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {products.map((product) => (
                        <article key={product.id} className="rounded-2xl bg-white p-4 shadow-sm flex flex-col justify-between">
                          <div className="grid grid-cols-[48px_1fr_auto] gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-[22px]">
                              {getItemIcon(product.categoryId)}
                            </div>
                            <div>
                              <h3 className="text-[15px] font-bold text-text">{product.nombre}</h3>
                              <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-gray-500">{product.descripcion}</p>
                              <p className="mt-1 text-[12px] font-bold text-primary">
                                {formatCurrency(product.precio)} · {product.tiempoPreparacion} min
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openProductModal(product)}
                              disabled={!canEditItems}
                              className="self-start rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                            >
                              + Agregar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {activeStep === 'pedido' && (
              <section className="space-y-4">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[20px] font-bold text-text">Pedido actual</h2>
                      <p className="mt-1 text-[13px] leading-5 text-gray-500">
                        {order ? `${order.customer.nombre} · Mesa ${table?.numero ?? tableId}` : 'Sin pedido abierto'}
                      </p>
                    </div>
                    {order && (
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusBadgeClass(order.estado)}`}>
                        {getOrderStatusLabel(order.estado)}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {orderFlow.map((step, index) => (
                      <div
                        key={step.label}
                        className={`rounded-xl px-2 py-2 text-center text-[10px] font-bold ${
                          step.done
                            ? 'bg-success text-white'
                            : step.active
                            ? 'bg-primary text-white'
                            : 'bg-background text-gray-400'
                        }`}
                      >
                        <span className="block text-[10px] opacity-80">{index + 1}</span>
                        {step.label}
                      </div>
                    ))}
                  </div>
                </div>

                {!order ? (
                  <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-sm">
                    <p className="font-bold text-text">No hay pedido abierto</p>
                    <button
                      type="button"
                      onClick={() => setActiveStep('cliente')}
                      className="mt-4 rounded-xl bg-primary px-5 py-3 text-[13px] font-bold text-white"
                    >
                      Abrir pedido
                    </button>
                  </div>
                ) : order.items.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-sm">
                    <p className="font-bold text-text">Aún no agregaste productos</p>
                    <button
                      type="button"
                      onClick={() => setActiveStep('menu')}
                      className="mt-4 rounded-xl bg-primary px-5 py-3 text-[13px] font-bold text-white"
                    >
                      Ir al menú
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {order.items.map((item) => {
                        const removedIngredients = getRemovedIngredients(item);

                        return (
                          <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="grid grid-cols-[42px_1fr_auto] gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background text-[20px]">
                                {getItemIcon(item.categoriaId)}
                              </div>
                              <div>
                                <h3 className="text-[15px] font-bold text-text">{item.nombreProducto}</h3>
                                <p className="mt-1 text-[12px] text-gray-500">
                                  {item.cantidad}x · {formatCurrency(item.precioUnitario)} c/u
                                </p>
                                {removedIngredients.map((ingredient) => (
                                  <p key={`${item.id}-${ingredient.nombre}`} className="text-[12px] font-semibold text-alert">
                                    Sin {ingredient.nombre.toLowerCase()}
                                  </p>
                                ))}
                                {item.observacion && (
                                  <p className="text-[12px] font-semibold text-primary">Nota: {item.observacion}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {canEditItems && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditItem(item)}
                                      className="h-8 w-8 rounded-lg bg-background text-[15px] font-bold"
                                      aria-label="Editar item"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleRemoveItem(item.id)}
                                      className="h-8 w-8 rounded-lg bg-alert/10 text-[15px] font-bold text-alert"
                                      aria-label="Eliminar item"
                                    >
                                      🗑
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                              <span className="text-[12px] font-semibold text-gray-500">Subtotal</span>
                              <span className="text-[16px] font-bold text-primary">{formatCurrency(item.subtotal)}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold text-text">Total</span>
                        <span className="text-[22px] font-bold text-primary">{formatCurrency(order.total)}</span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium text-gray-500">
                        Tiempo estimado: {order.tiempoEstimadoMinutos} min · Items: {order.items.length}
                      </p>
                    </div>

                    {!isBillRequested && (
                      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                        {order.estado === 'REGISTRADO' && (
                          <button
                            type="button"
                            onClick={() => void handleChangeOrderStatus('EN_PREPARACION')}
                            disabled={isChangingStatus || !hasItems}
                            className="w-full md:w-auto flex-1 rounded-xl bg-primary px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                          >
                            Enviar a cocina
                          </button>
                        )}

                        {order.estado === 'EN_PREPARACION' && (
                          <button
                            type="button"
                            onClick={() => void handleChangeOrderStatus('LISTO')}
                            disabled={isChangingStatus}
                            className="w-full md:w-auto flex-1 rounded-xl bg-info px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                          >
                            Simular cocina: listo para entregar
                          </button>
                        )}

                        {(order.estado === 'LISTO' || order.estado === 'EN_CAMINO') && (
                          <button
                            type="button"
                            onClick={() => void handleChangeOrderStatus('ENTREGADO')}
                            disabled={isChangingStatus}
                            className="w-full md:w-auto flex-1 rounded-xl bg-success px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                          >
                            Marcar entregado en mesa
                          </button>
                        )}

                        {order.estado === 'ENTREGADO' && (
                          <button
                            type="button"
                            onClick={() => void handleRequestBill()}
                            disabled={isRequestingBill}
                            className="w-full md:w-auto flex-1 rounded-xl bg-primary px-5 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                          >
                            {isRequestingBill ? 'Solicitando...' : 'Solicitar cuenta'}
                          </button>
                        )}
                      </div>
                    )}

                    {isBillRequested && (
                      <div className="rounded-[1.5rem] bg-info/10 p-4 text-[13px] font-bold text-info">
                        Cuenta solicitada. Caja puede continuar con el cobro y luego liberar la mesa.
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <section className="max-h-[92vh] w-full max-w-[390px] overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-bold text-text">
                  {editingItemId ? 'Editar item' : 'Nuevo pedido'}
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-gray-500">
                  Agrega producto, cantidad, observaciones e ingredientes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsItemModalOpen(false);
                  resetItemForm();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-text text-[16px] font-bold text-white"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text">Categoría</label>
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(Number(event.target.value))}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] outline-none focus:border-primary"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text">Producto</label>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(Number(event.target.value))}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] outline-none focus:border-primary"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[1fr_90px] gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text">Observación</label>
                  <input
                    type="text"
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                    placeholder="Ej. Sin locoto"
                    className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-center text-[14px] outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Precio</p>
                  <p className="text-[16px] font-bold text-text">{selectedProduct ? formatCurrency(selectedProduct.precio) : 'Bs 0.00'}</p>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Tiempo</p>
                  <p className="text-[16px] font-bold text-text">{selectedProduct ? `${selectedProduct.tiempoPreparacion} min` : '0 min'}</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-text">Ingredientes</p>
                    <p className="text-[12px] text-gray-500">Switch activo = lleva.</p>
                  </div>
                  <span className={`relative inline-flex h-6 w-11 rounded-full ${hasCustomIngredients ? 'bg-success' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${hasCustomIngredients ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {ingredientSelections.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-gray-500">Sin ingredientes configurados.</p>
                  ) : (
                    ingredientSelections.map((ingredient) => (
                      <div key={`${ingredient.id}-${ingredient.nombre}`} className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-3 last:border-b-0">
                        <span className={`text-[13px] font-bold ${ingredient.incluido ? 'text-text' : 'text-gray-400 line-through'}`}>
                          {ingredient.nombre}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleIngredient(ingredient.id)}
                          className={`relative inline-flex h-6 w-11 rounded-full ${ingredient.incluido ? 'bg-success' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${ingredient.incluido ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {removedFromCurrentSelection.length > 0 && (
                  <p className="mt-2 text-[12px] font-bold text-alert">
                    Cocina verá: {removedFromCurrentSelection.map((ingredient) => `sin ${ingredient.nombre.toLowerCase()}`).join(', ')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsItemModalOpen(false);
                    resetItemForm();
                  }}
                  className="rounded-xl border border-text px-4 py-3 text-[13px] font-bold text-text"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveItem()}
                  disabled={isSavingItem || !selectedProductId}
                  className="rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {isSavingItem ? 'Guardando...' : editingItemId ? 'Listo' : 'Crear'}
                </button>
              </div>
            </div>
          </section>
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
