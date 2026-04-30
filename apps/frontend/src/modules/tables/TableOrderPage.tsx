import { useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from '../../shared/components/FeedbackModal';
import {
  addOrderItemToTableMock,
  getOpenOrderByTableMock,
  listOrderCategoriesMock,
  listOrderProductsByCategoryMock,
  removeOrderItemFromTableMock,
  requestBillForTableMock,
  saveOrderCustomerMock,
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

function formatCurrency(value: number) {
  return `Bs ${value.toFixed(2)}`;
}

function getOrderStatusLabel(status: TableOrder['estado']) {
  switch (status) {
    case 'ABIERTO':
      return 'Abierto';
    case 'EN_PREPARACION':
      return 'En preparación';
    case 'LISTO':
      return 'Listo';
    case 'ENTREGADO':
      return 'Entregado';
    case 'CUENTA_SOLICITADA':
      return 'Cuenta solicitada';
    case 'PAGADO':
      return 'Pagado';
    case 'CANCELADO':
      return 'Cancelado';
  }
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const isBillRequested = order?.estado === 'CUENTA_SOLICITADA';

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
        setSelectedProductId(categoryProducts[0]?.id ?? 0);
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

  const refreshOrder = async () => {
    const latestOrder = await getOpenOrderByTableMock(tableId);
    setOrder(latestOrder);

    if (latestOrder) {
      setCustomerName(latestOrder.customer.nombre);
      setCustomerPhone(latestOrder.customer.telefono);
      setCustomerCi(latestOrder.customer.ci);
    }
  };

  const handleSaveCustomer = async () => {
    setIsSavingCustomer(true);

    try {
      await saveOrderCustomerMock(tableId, {
        nombre: customerName,
        telefono: customerPhone,
        ci: customerCi,
      });

      await refreshOrder();

      setFeedback({
        type: 'success',
        title: 'Datos guardados',
        message: 'Los datos del cliente se guardaron correctamente.',
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

  const handleAddItem = async () => {
    setIsAddingItem(true);

    try {
      await addOrderItemToTableMock(tableId, {
        categoriaId: selectedCategoryId,
        productoId: selectedProductId,
        cantidad: Number(quantity),
        observacion: observation,
      });

      await refreshOrder();

      setQuantity('1');
      setObservation('');

      setFeedback({
        type: 'success',
        title: 'Item agregado',
        message: 'El producto se agregó correctamente al pedido.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'No se pudo agregar',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al agregar el item',
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeOrderItemFromTableMock(tableId, itemId);
      await refreshOrder();

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

  const handleRequestBill = async () => {
    setIsRequestingBill(true);

    try {
      await requestBillForTableMock(tableId);
      await updateTableStatusMock(tableId, 'CUENTA_SOLICITADA');
      await refreshOrder();

      setFeedback({
        type: 'success',
        title: 'Cuenta solicitada',
        message: 'La mesa ya quedó lista para pasar al flujo de caja.',
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

  return (
    <main className="h-screen overflow-hidden bg-background px-4 py-6 text-text">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden">
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-[28px] leading-none text-text"
          >
            ←
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-title font-bold text-text">Gestión de mesas</h1>
              <p className="mt-1 text-[14px] leading-5 text-gray-500">
                {table ? `Nuevo pedido · Mesa ${table.numero}` : 'Nuevo pedido'}
              </p>
              <p className="mt-1 text-[13px] font-medium text-gray-500">
                {role === 'ADMIN'
                  ? 'Modo administrador'
                  : 'Modo operativo de mesero'}
              </p>
            </div>

            {order && (
              <span className="rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-text shadow-sm">
                {getOrderStatusLabel(order.estado)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-[1.5rem] bg-white p-5 text-[14px] text-gray-500 shadow-sm">
              Cargando pedido...
            </div>
          ) : (
            <div className="space-y-4">
              {isBillRequested && (
                <div className="rounded-[1.5rem] bg-info/10 px-4 py-4 text-[14px] font-medium text-info">
                  La cuenta ya fue solicitada. El pedido quedó bloqueado para
                  cambios.
                </div>
              )}

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <h2 className="text-[20px] font-bold text-text">
                  Datos del cliente
                </h2>

                <div className="mt-4 space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">
                      Nombre del cliente
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Roberto García"
                      disabled={isBillRequested}
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
                        placeholder="70011223"
                        disabled={isBillRequested}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">
                        CI
                      </label>
                      <input
                        type="text"
                        value={customerCi}
                        onChange={(event) => setCustomerCi(event.target.value)}
                        placeholder="234531"
                        disabled={isBillRequested}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveCustomer()}
                      disabled={isSavingCustomer || isBillRequested}
                      className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                      {isSavingCustomer ? 'Guardando...' : 'Guardar datos'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <h2 className="text-[20px] font-bold text-text">Nuevo pedido</h2>

                <div className="mt-4 space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">
                      Categoría
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(event) =>
                        setSelectedCategoryId(Number(event.target.value))
                      }
                      disabled={isBillRequested}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-[1fr_92px] gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-semibold text-text">
                        Plato
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(event) =>
                          setSelectedProductId(Number(event.target.value))
                        }
                        disabled={isBillRequested}
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
                        disabled={isBillRequested}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-text">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={observation}
                      onChange={(event) => setObservation(event.target.value)}
                      placeholder="Ej. Sin locoto"
                      rows={3}
                      disabled={isBillRequested}
                      className="resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-primary disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-background px-4 py-3">
                      <p className="text-[12px] font-medium uppercase tracking-wide text-gray-500">
                        Precio
                      </p>
                      <p className="mt-1 text-[18px] font-bold text-text">
                        {selectedProduct
                          ? formatCurrency(selectedProduct.precio)
                          : 'Bs 0.00'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-background px-4 py-3">
                      <p className="text-[12px] font-medium uppercase tracking-wide text-gray-500">
                        Tiempo
                      </p>
                      <p className="mt-1 text-[18px] font-bold text-text">
                        {selectedProduct
                          ? `${selectedProduct.tiempoPreparacion} min`
                          : '0 min'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    {!isBillRequested && (
                      <button
                        type="button"
                        onClick={() => void handleAddItem()}
                        disabled={
                          isAddingItem ||
                          !selectedCategoryId ||
                          !selectedProductId
                        }
                        className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                      >
                        {isAddingItem ? 'Agregando...' : 'Agregar item'}
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[20px] font-bold text-text">
                    Pedido actual
                  </h2>
                  <span className="rounded-full bg-background px-3 py-1 text-[13px] font-semibold text-text">
                    {order?.items.length ?? 0} items
                  </span>
                </div>

                {!order || order.items.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-background px-4 py-5 text-center">
                    <p className="text-[14px] leading-6 text-gray-500">
                      Todavía no agregaste items al pedido.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-gray-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[16px] font-bold text-text">
                              {item.nombreProducto}
                            </p>
                            <p className="mt-1 text-[13px] text-gray-500">
                              {item.categoriaNombre}
                            </p>
                          </div>

                          {!isBillRequested && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveItem(item.id)}
                              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-alert transition-colors hover:bg-alert/5"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-[14px] text-text">
                          <p>
                            <span className="font-semibold">Cantidad:</span>{' '}
                            {item.cantidad}
                          </p>
                          <p>
                            <span className="font-semibold">Tiempo:</span>{' '}
                            {item.tiempoPreparacion} min
                          </p>
                          <p>
                            <span className="font-semibold">Precio:</span>{' '}
                            {formatCurrency(item.precioUnitario)}
                          </p>
                          <p>
                            <span className="font-semibold">Subtotal:</span>{' '}
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>

                        {item.observacion && (
                          <p className="mt-3 text-[14px] leading-6 text-gray-500">
                            <span className="font-semibold text-text">
                              Observación:
                            </span>{' '}
                            {item.observacion}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="rounded-2xl bg-background px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[16px] font-semibold text-text">
                          Total del pedido
                        </span>
                        <span className="text-[20px] font-bold text-primary">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>

                    {!isBillRequested && (
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => void handleRequestBill()}
                          disabled={isRequestingBill}
                          className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                        >
                          {isRequestingBill
                            ? 'Solicitando...'
                            : 'Solicitar cuenta'}
                        </button>
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