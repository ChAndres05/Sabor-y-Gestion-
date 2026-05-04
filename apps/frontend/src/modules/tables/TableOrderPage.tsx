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
  updateOrderItemInTableMock,
  updateOrderItemQuantityMock,
  updateOrderStatusForTableMock,
} from '../../shared/mocks/table-orders.mock';
import {
  getTableByIdMock,
  updateTableStatusMock,
} from '../../shared/mocks/tables.mock';
import type { RestaurantTable } from './types/table.types';
import type {
  OrderCatalogCategory,
  OrderCatalogProduct,
  TableOrder,
  TableOrderItem,
  TableOrderStatus,
} from './types/table-order.types';

interface TableOrderPageProps {
  role: 'ADMIN' | 'MESERO';
  tableId: number;
  onBack: () => void;
}

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

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getOrderStatusLabel(status: TableOrderStatus) {
  switch (status) {
    case 'REGISTRADO':
      return 'Registrado';
    case 'EN_PREPARACION':
      return 'En preparación';
    case 'LISTO':
      return 'Listo';
    case 'EN_CAMINO':
      return 'En camino';
    case 'ENTREGADO':
      return 'Entregado en mesa';
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
      return 'bg-success/10 text-success';
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

export default function TableOrderPage({
  role,
  tableId,
  onBack,
}: TableOrderPageProps) {
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [order, setOrder] = useState<TableOrder | null>(null);

  const [categories, setCategories] = useState<OrderCatalogCategory[]>([]);
  const [products, setProducts] = useState<OrderCatalogProduct[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCi, setCustomerCi] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  const [ingredientSelections, setIngredientSelections] = useState<IngredientSelection[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
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
  const isTableOutOfService = table?.estado === 'FUERA_DE_SERVICIO';
  const hasItems = (order?.items.length ?? 0) > 0;
  const canEditItems =
    Boolean(order) &&
    !isBillRequested &&
    !isTableOutOfService &&
    (order?.estado === 'REGISTRADO' || order?.estado === 'EN_PREPARACION');
  const canSaveCustomer = !isBillRequested && !isTableOutOfService;
  const itemFormTitle = editingItemId ? 'Editar item' : 'Nuevo pedido';
  const removedFromCurrentSelection = ingredientSelections.filter(
    (ingredient) => !ingredient.incluido
  );
  const hasCustomIngredients = ingredientSelections.some(
    (ingredient) => ingredient.incluido !== ingredient.incluidoPorDefecto
  );

  const flowSteps = [
    {
      label: 'Pedido',
      done: Boolean(order),
      active: !order,
    },
    {
      label: 'Items',
      done: hasItems,
      active: Boolean(order) && !hasItems,
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

        if (categoriesData.length > 0) {
          setSelectedCategoryId(categoriesData[0].id);
        }

        if (orderData) {
          setCustomerName(orderData.customer.nombre);
          setCustomerPhone(orderData.customer.telefono);
          setCustomerCi(orderData.customer.ci);
        } else if (tableData.estado === 'LIBRE') {
          setCustomerName(`Mesa ${tableData.numero}`);
        }
      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'No se pudo cargar',
          message:
            error instanceof Error
              ? error.message
              : 'Ocurrió un error al cargar el pedido',
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
        const categoryProducts = await listOrderProductsByCategoryMock(
          selectedCategoryId
        );
        setProducts(categoryProducts);
        setSelectedProductId((currentProductId) =>
          categoryProducts.some((product) => product.id === currentProductId)
            ? currentProductId
            : categoryProducts[0]?.id ?? 0
        );
      } catch (error) {
        setFeedback({
          type: 'error',
          title: 'No se pudieron cargar los productos',
          message:
            error instanceof Error
              ? error.message
              : 'Ocurrió un error inesperado',
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

  const refreshOrder = async () => {
    const latestOrder = await getOpenOrderByTableMock(tableId);
    setOrder(latestOrder);

    if (latestOrder) {
      setCustomerName(latestOrder.customer.nombre);
      setCustomerPhone(latestOrder.customer.telefono);
      setCustomerCi(latestOrder.customer.ci);
    }
  };

  const refreshTable = async () => {
    const latestTable = await getTableByIdMock(tableId);
    setTable(latestTable);
  };

  const refreshPageState = async () => {
    await Promise.all([refreshOrder(), refreshTable()]);
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setQuantity('1');
    setObservation('');
    setIngredientSelections(buildDefaultIngredients(selectedProduct));
  };

  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);

    try {
      await saveOrderCustomerMock(tableId, {
        nombre: customerName,
        telefono: customerPhone,
        ci: customerCi,
      });

      await updateTableStatusMock(tableId, 'OCUPADA');
      await refreshPageState();

      setFeedback({
        type: 'success',
        title: order ? 'Datos actualizados' : 'Pedido abierto',
        message: order
          ? 'Los datos del cliente se actualizaron correctamente.'
          : 'Se abrió un pedido de mesa. Ya puedes agregar productos.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo guardar',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al guardar los datos del cliente',
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

      setFeedback({
        type: 'success',
        title: editingItemId ? 'Item actualizado' : 'Item agregado',
        message: editingItemId
          ? 'El item se actualizó correctamente en el pedido.'
          : 'El producto se agregó correctamente al pedido.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: editingItemId ? 'No se pudo actualizar' : 'No se pudo agregar',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al guardar el item',
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleUpdateQuantity = async (itemId: number, nextQuantity: number) => {
    try {
      await updateOrderItemQuantityMock(tableId, itemId, nextQuantity);
      await refreshOrder();
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo actualizar',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado',
      });
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeOrderItemFromTableMock(tableId, itemId);
      await refreshOrder();

      if (editingItemId === itemId) {
        resetItemForm();
      }

      setFeedback({
        type: 'success',
        title: 'Item eliminado',
        message: 'El item se eliminó correctamente del pedido.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo eliminar',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado',
      });
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
  };

  const handleChangeOrderStatus = async (status: TableOrderStatus) => {
    setIsChangingStatus(true);

    try {
      await updateOrderStatusForTableMock(tableId, status);

      if (
        status === 'EN_PREPARACION' ||
        status === 'LISTO' ||
        status === 'EN_CAMINO' ||
        status === 'ENTREGADO'
      ) {
        await updateTableStatusMock(tableId, 'OCUPADA');
      }

      await refreshPageState();

      setFeedback({
        type: 'success',
        title: 'Estado actualizado',
        message: `El pedido ahora está ${getOrderStatusLabel(status).toLowerCase()}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo cambiar el estado',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado',
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
        message: 'La mesa queda bloqueada para cambios y lista para caja.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo solicitar cuenta',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado',
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
    <main className="h-screen overflow-hidden bg-background px-4 py-6 text-text">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden">
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-[28px] leading-none text-text"
          >
            ←
          </button>

          <div className="flex flex-col gap-3 rounded-[1.5rem] bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-title font-bold text-text">
                Pedido en mesa
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-gray-500">
                {table
                  ? `Mesa ${table.numero} · ${getTableStatusLabel(table.estado)} · ${table.capacidad} personas`
                  : 'Mesa seleccionada'}
              </p>
              <p className="mt-1 text-[13px] font-medium text-gray-500">
                {role === 'ADMIN'
                  ? 'Vista mockeada para que administración revise y apoye pedidos de mesa'
                  : 'Flujo operativo mockeado para que el mesero tome y gestione pedidos'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {order && (
                <span
                  className={`rounded-full px-3 py-2 text-[12px] font-semibold ${getStatusBadgeClass(
                    order.estado
                  )}`}
                >
                  {getOrderStatusLabel(order.estado)}
                </span>
              )}
              {table && (
                <span className="rounded-full bg-background px-3 py-2 text-[12px] font-semibold text-text">
                  Mesa: {getTableStatusLabel(table.estado)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {flowSteps.map((step, index) => (
              <div
                key={step.label}
                className={`rounded-2xl px-3 py-3 text-center text-[12px] font-bold shadow-sm ${
                  step.done
                    ? 'bg-success text-white'
                    : step.active
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-400'
                }`}
              >
                <span className="block text-[11px] opacity-80">{index + 1}</span>
                {step.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-[1.5rem] bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando pedido...
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[470px_1fr]">
              <div className="space-y-4">
                {isTableOutOfService && (
                  <div className="rounded-[1.5rem] bg-gray-100 px-4 py-4 text-[14px] font-medium text-gray-600">
                    Esta mesa está fuera de servicio. No se puede abrir ni editar pedidos.
                  </div>
                )}

                {isBillRequested && (
                  <div className="rounded-[1.5rem] bg-info/10 px-4 py-4 text-[14px] font-medium text-info">
                    La cuenta ya fue solicitada. El pedido queda bloqueado para caja.
                  </div>
                )}

                <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                  <h2 className="text-[20px] font-bold text-text">
                    Datos de mesa
                  </h2>
                  <p className="mt-1 text-[13px] leading-5 text-gray-500">
                    Abre el pedido con una referencia rápida. Luego podrás agregar items.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">
                        Cliente / referencia de mesa
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        placeholder="Ej. Mesa familia García"
                        disabled={!canSaveCustomer}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-text">
                          Teléfono
                        </label>
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                          placeholder="Opcional"
                          disabled={!canSaveCustomer}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-text">
                          CI / NIT
                        </label>
                        <input
                          type="text"
                          value={customerCi}
                          onChange={(event) => setCustomerCi(event.target.value)}
                          placeholder="Opcional"
                          disabled={!canSaveCustomer}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSaveCustomer()}
                      disabled={isSavingCustomer || !canSaveCustomer}
                      className="w-full rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                      {isSavingCustomer
                        ? 'Guardando...'
                        : order
                        ? 'Actualizar datos'
                        : 'Abrir pedido'}
                    </button>
                  </div>
                </section>

                <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[20px] font-bold text-text">
                        {itemFormTitle}
                      </h2>
                      <p className="mt-1 text-[13px] leading-5 text-gray-500">
                        Personaliza ingredientes y observaciones como en una toma real de mesa.
                      </p>
                    </div>

                    {editingItemId && (
                      <button
                        type="button"
                        onClick={resetItemForm}
                        className="rounded-xl bg-background px-3 py-2 text-[12px] font-semibold text-text transition-colors hover:bg-black/5"
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">
                        Categoría
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(event) =>
                          setSelectedCategoryId(Number(event.target.value))
                        }
                        disabled={!canEditItems}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-[1fr_96px] gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-text">
                          Plato
                        </label>
                        <select
                          value={selectedProductId}
                          onChange={(event) =>
                            setSelectedProductId(Number(event.target.value))
                          }
                          disabled={!canEditItems}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                        >
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-semibold text-text">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quantity}
                          onChange={(event) => setQuantity(event.target.value)}
                          disabled={!canEditItems}
                          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">
                        Descripción / observación para cocina
                      </label>
                      <textarea
                        value={observation}
                        onChange={(event) => setObservation(event.target.value)}
                        placeholder="Ej. Sin locoto, término medio, sin hielo"
                        rows={3}
                        disabled={!canEditItems}
                        className="resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-text">
                            Ingredientes (personalizar)
                          </p>
                          <p className="text-[12px] text-gray-500">
                            {hasCustomIngredients
                              ? 'Hay cambios personalizados para este item'
                              : 'Puedes activar o quitar ingredientes antes de agregar'}
                          </p>
                        </div>
                        <span
                          className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${
                            hasCustomIngredients ? 'bg-success' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              hasCustomIngredients ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        {ingredientSelections.length === 0 ? (
                          <p className="px-4 py-4 text-[13px] text-gray-500">
                            Este plato no tiene ingredientes configurados.
                          </p>
                        ) : (
                          ingredientSelections.map((ingredient) => (
                            <div
                              key={`${ingredient.id}-${ingredient.nombre}`}
                              className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0"
                            >
                              <span
                                className={`text-[14px] font-semibold ${
                                  ingredient.incluido
                                    ? 'text-text'
                                    : 'text-gray-400 line-through'
                                }`}
                              >
                                {ingredient.nombre}
                              </span>

                              <div className="flex items-center gap-3">
                                {!ingredient.incluido && (
                                  <span className="text-[12px] italic text-gray-400">
                                    no lleva
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleToggleIngredient(ingredient.id)}
                                  disabled={!canEditItems}
                                  className={`relative inline-flex h-7 w-12 rounded-full transition-colors disabled:opacity-60 ${
                                    ingredient.incluido ? 'bg-success' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                      ingredient.incluido ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {removedFromCurrentSelection.length > 0 && (
                        <p className="mt-2 text-[12px] font-medium text-alert">
                          Se enviará a cocina:{' '}
                          {removedFromCurrentSelection
                            .map((ingredient) => `sin ${ingredient.nombre.toLowerCase()}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-background px-4 py-4">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-gray-500">
                          Precio
                        </p>
                        <p className="mt-1 text-[20px] font-bold text-text">
                          {selectedProduct
                            ? formatCurrency(selectedProduct.precio)
                            : 'Bs 0.00'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-background px-4 py-4">
                        <p className="text-[12px] font-medium uppercase tracking-wide text-gray-500">
                          Tiempo
                        </p>
                        <p className="mt-1 text-[20px] font-bold text-text">
                          {selectedProduct
                            ? `${selectedProduct.tiempoPreparacion} min`
                            : '0 min'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSaveItem()}
                      disabled={
                        isSavingItem ||
                        !canEditItems ||
                        !selectedCategoryId ||
                        !selectedProductId
                      }
                      className="w-full rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                      {isSavingItem
                        ? 'Guardando...'
                        : editingItemId
                        ? 'Actualizar item'
                        : 'Agregar item'}
                    </button>

                    {!order && (
                      <p className="text-center text-[12px] font-medium text-gray-500">
                        Primero abre el pedido en la sección Datos de mesa.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-[20px] font-bold text-text">
                      Pedido actual
                    </h2>
                    <p className="mt-1 text-[13px] leading-5 text-gray-500">
                      {order
                        ? `#${order.id} · ${order.waiterName} · ${formatDateTime(
                            order.fechaCreacion
                          )}`
                        : 'Aún no existe pedido para esta mesa'}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-background px-3 py-1 text-[13px] font-semibold text-primary">
                    {order?.items.length ?? 0} items
                  </span>
                </div>

                {!order ? (
                  <div className="mt-4 rounded-2xl bg-background px-4 py-8 text-center">
                    <p className="text-[15px] font-semibold text-text">
                      Abre el pedido primero
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-gray-500">
                      Registra una referencia del cliente para ocupar la mesa y comenzar a agregar productos.
                    </p>
                  </div>
                ) : order.items.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-background px-4 py-8 text-center">
                    <p className="text-[15px] font-semibold text-text">
                      Todavía no agregaste items
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-gray-500">
                      Selecciona una categoría, plato, cantidad e ingredientes para cocina.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-3">
                      {order.items.map((item) => {
                        const removedIngredients = getRemovedIngredients(item);

                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-4 transition-colors ${
                              editingItemId === item.id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="grid grid-cols-[56px_1fr_auto] items-start gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-2xl">
                                {getItemIcon(item.categoriaId)}
                              </div>

                              <div>
                                <p className="text-[16px] font-bold text-text">
                                  {item.nombreProducto}
                                </p>
                                <p className="mt-1 text-[13px] text-gray-500">
                                  Cantidad: {item.cantidad}x · {formatCurrency(item.precioUnitario)} c/u
                                </p>
                                {removedIngredients.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {removedIngredients.map((ingredient) => (
                                      <p
                                        key={`${item.id}-${ingredient.nombre}`}
                                        className="text-[12px] font-medium text-alert"
                                      >
                                        - Sin {ingredient.nombre.toLowerCase()}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {item.observacion && (
                                  <p className="mt-1 text-[12px] font-medium text-primary">
                                    Nota: {item.observacion}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {canEditItems && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditItem(item)}
                                      className="rounded-xl px-2 py-2 text-[17px] transition-colors hover:bg-background"
                                      title="Editar item"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleRemoveItem(item.id)}
                                      className="rounded-xl px-2 py-2 text-[17px] text-alert transition-colors hover:bg-alert/5"
                                      title="Eliminar item"
                                    >
                                      🗑
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                              <div className="flex items-center overflow-hidden rounded-2xl border border-gray-200">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUpdateQuantity(item.id, item.cantidad - 1)
                                  }
                                  disabled={!canEditItems || item.cantidad <= 1}
                                  className="px-3 py-2 text-[16px] font-bold disabled:opacity-40"
                                >
                                  -
                                </button>
                                <span className="min-w-10 px-3 text-center text-[14px] font-bold">
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleUpdateQuantity(item.id, item.cantidad + 1)
                                  }
                                  disabled={!canEditItems}
                                  className="px-3 py-2 text-[16px] font-bold disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right">
                                <p className="text-[12px] font-medium uppercase tracking-wide text-gray-500">
                                  Subtotal
                                </p>
                                <p className="text-[16px] font-bold text-primary">
                                  {formatCurrency(item.subtotal)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl bg-background px-4 py-4">
                      <div className="grid grid-cols-2 gap-3 text-[13px] text-gray-500">
                        <p>
                          Estado pedido:{' '}
                          <span className="font-bold text-text">
                            {getOrderStatusLabel(order.estado)}
                          </span>
                        </p>
                        <p>
                          Tiempo estimado:{' '}
                          <span className="font-bold text-text">
                            {order.tiempoEstimadoMinutos} min
                          </span>
                        </p>
                        <p>
                          Subtotal:{' '}
                          <span className="font-bold text-text">
                            {formatCurrency(order.subtotal)}
                          </span>
                        </p>
                        <p>
                          Entrega:{' '}
                          <span className="font-bold text-text">
                            {formatDateTime(order.fechaEntrega)}
                          </span>
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
                        <span className="text-[16px] font-semibold text-text">
                          Total del pedido
                        </span>
                        <span className="text-[22px] font-bold text-primary">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>

                    {!isBillRequested && !isTableOutOfService && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {order.estado === 'REGISTRADO' && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleChangeOrderStatus('EN_PREPARACION')
                            }
                            disabled={isChangingStatus || !hasItems}
                            className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 md:col-span-2"
                          >
                            Enviar a cocina
                          </button>
                        )}

                        {order.estado === 'EN_PREPARACION' && (
                          <button
                            type="button"
                            onClick={() => void handleChangeOrderStatus('LISTO')}
                            disabled={isChangingStatus}
                            className="rounded-2xl bg-info px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60 md:col-span-2"
                          >
                            Simular cocina: marcar listo
                          </button>
                        )}

                        {(order.estado === 'LISTO' || order.estado === 'EN_CAMINO') && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleChangeOrderStatus('ENTREGADO')
                            }
                            disabled={isChangingStatus}
                            className="rounded-2xl bg-success px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60 md:col-span-2"
                          >
                            Marcar entregado en mesa
                          </button>
                        )}

                        {order.estado === 'ENTREGADO' && (
                          <button
                            type="button"
                            onClick={() => void handleRequestBill()}
                            disabled={isRequestingBill}
                            className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 md:col-span-2"
                          >
                            {isRequestingBill
                              ? 'Solicitando...'
                              : 'Solicitar cuenta'}
                          </button>
                        )}
                      </div>
                    )}

                    {isBillRequested && (
                      <div className="rounded-2xl bg-info/10 px-4 py-4 text-[14px] font-medium text-info">
                        Siguiente paso: caja registra el pago y luego la mesa puede volver a libre.
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

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
