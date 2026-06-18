import { useState, useEffect, useCallback } from 'react';
import { Menu, User, FileDown, Sheet, ArrowUp, Loader2 } from 'lucide-react';
import DateRangePicker from '../../../shared/components/DateRangePicker';
import { dashboardApi } from '../../../shared/api/dashboard.api';
import type { DashboardData } from '../../../shared/mocks/dashboard.mock';
import { pusherClient } from '../../../shared/utils/pusher';
import { jsPDF } from 'jspdf';

interface AdminDashboardPageProps {
  onBack: () => void;
  userName?: string;
}

type TabType = 'hoy' | 'rango' | 'mes';

const X_AXIS_LABELS = ['10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM'];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function AdminDashboardPage({ onBack, userName = 'Juanito Perez' }: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hoy');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let startStr: string | undefined;
      let endStr: string | undefined;

      if (activeTab === 'rango' && customRange) {
        const toYmd = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        startStr = toYmd(customRange.start);
        endStr = toYmd(customRange.end);
      }

      if (activeTab === 'rango' && !customRange) {
        setLoading(false);
        return;
      }

      const res = await dashboardApi.getDashboardData(activeTab, startStr, endStr);
      setData(res);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [activeTab, customRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time updates with Pusher
  useEffect(() => {
    const tablesChannel = pusherClient.subscribe('tables-channel');
    const cajaChannel = pusherClient.subscribe('caja-channel');

    const handleUpdate = () => {
      fetchDashboardData();
    };

    tablesChannel.bind('table-order-updated', handleUpdate);
    cajaChannel.bind('caja-updated', handleUpdate);

    return () => {
      tablesChannel.unbind('table-order-updated', handleUpdate);
      cajaChannel.unbind('caja-updated', handleUpdate);
      pusherClient.unsubscribe('tables-channel');
      pusherClient.unsubscribe('caja-channel');
    };
  }, [fetchDashboardData]);

  const handleRangeSelected = (start: Date, end: Date) => {
    setCustomRange({ start, end });
    setActiveTab('rango');
    setIsCalendarOpen(false);
  };

  const getSalesLabel = () => {
    if (activeTab === 'hoy') return 'VENTAS NETAS HOY';
    if (activeTab === 'mes') return 'VENTAS NETAS ESTE MES';
    if (customRange) {
      const startStr = `${customRange.start.getDate()} ${MONTH_NAMES[customRange.start.getMonth()].substring(0, 3)}`;
      const endStr = `${customRange.end.getDate()} ${MONTH_NAMES[customRange.end.getMonth()].substring(0, 3)}`;
      return `VENTAS NETAS (${startStr} - ${endStr})`;
    }
    return 'VENTAS NETAS';
  };

  const getClientRankingLabel = () => {
    if (activeTab === 'hoy') return 'Mejores Clientes (Top 3 Hoy)';
    if (activeTab === 'mes') return 'Mejores Clientes (Top 3 Mensual)';
    if (customRange) {
      const startStr = `${customRange.start.getDate()} ${MONTH_NAMES[customRange.start.getMonth()].substring(0, 3)}`;
      const endStr = `${customRange.end.getDate()} ${MONTH_NAMES[customRange.end.getMonth()].substring(0, 3)}`;
      return `Mejores Clientes (Top 3 ${startStr} - ${endStr})`;
    }
    return 'Mejores Clientes (Top 3)';
  };

  const handleDownloadPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    doc.setFont('helvetica');

    // Title
    doc.setFontSize(20);
    doc.setTextColor(179, 64, 27); // #B3401B
    doc.text('REPORTE DE VENTAS Y RENDIMIENTO', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-BO')} a las ${new Date().toLocaleTimeString('es-BO')}`, 14, 28);
    doc.text(`Usuario: ${userName}`, 14, 33);

    // Horizontal Line
    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);

    // Period / Filter
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Período de Reporte:', 14, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(getSalesLabel().replace('VENTAS NETAS', '').trim() || 'Hoy', 60, 46);

    // Summary Box
    doc.setFillColor(244, 239, 230); // #F4EFE6
    doc.rect(14, 52, 182, 25, 'F');

    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL VENTAS NETAS', 20, 62);

    doc.setFontSize(18);
    doc.setTextColor(179, 64, 27); // #B3401B
    doc.text(data.ventas, 20, 71);

    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52); // green-700
    doc.text(`Crecimiento: ${data.porcentaje}`, 120, 67);

    // Top dishes
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Platos Más Vendidos (Top 3)', 14, 90);

    let currentY = 100;
    data.platos.forEach((plato, idx) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);
      doc.text(`${idx + 1}. ${plato.nombre}`, 18, currentY);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${plato.u} unidades`, 130, currentY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`(${plato.pct} del total)`, 160, currentY);
      currentY += 8;
    });

    // Peak Hours
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Horas Pico de Ventas', 14, currentY + 10);
    currentY += 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);
    doc.text(`Hora de mayor demanda: ${data.horas.pico}`, 18, currentY);
    currentY += 15;

    // Best Clients
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(getClientRankingLabel(), 14, currentY + 5);
    currentY += 15;

    // Table header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('CLIENTE', 18, currentY);
    doc.text('CONSUMO', 110, currentY);
    doc.text('CANT. PEDIDOS', 160, currentY);

    doc.setDrawColor(220);
    doc.line(14, currentY + 2, 196, currentY + 2);
    currentY += 8;

    data.clientes.forEach((cliente) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);
      doc.text(cliente.nombre, 18, currentY);
      doc.text(cliente.consumo, 110, currentY);
      doc.text(String(cliente.pedidos), 160, currentY);
      currentY += 8;
    });

    // Footer / Disclaimer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Restaurante Sabor y Gestión - Sistema de Business Intelligence (BI)', 14, 280);

    doc.save(`Reporte_Dashboard_${activeTab}.pdf`);
  };

  const handleExportExcel = () => {
    if (!data) return;

    // Generate bar chart data for hours
    const hourBars = data.horas.barras.map((heightStr, idx) => {
      const pct = parseFloat(heightStr) || 0;
      const blocks = Math.round(pct / 10);
      const isPeak = idx === data.horas.picoIndex;
      const barStr = '█'.repeat(Math.max(0, blocks)) + '░'.repeat(Math.max(0, 10 - blocks));
      const label = X_AXIS_LABELS[idx];
      return {
        label,
        bar: barStr,
        pct: `${pct}%`,
        note: isPeak ? '★ Pico de Ventas' : ''
      };
    });

    // Generate beautiful HTML table for Excel
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Reporte BI</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          .header { font-size: 16px; font-weight: bold; color: #B3401B; height: 30px; }
          .meta { font-size: 10px; color: #666; }
          .section { font-weight: bold; background-color: #48729A; color: white; height: 25px; }
          .th { font-weight: bold; background-color: #F4EFE6; border: 1px solid #ccc; }
          .td { border: 1px solid #ccc; }
          .total { font-weight: bold; color: #B3401B; font-size: 14px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="3" class="header">REPORTE DE VENTAS Y RENDIMIENTO</td></tr>
          <tr><td colspan="3" class="meta">Generado el: ${new Date().toLocaleDateString('es-BO')} a las ${new Date().toLocaleTimeString('es-BO')}</td></tr>
          <tr><td colspan="3" class="meta">Usuario: ${userName}</td></tr>
          <tr><td colspan="3" class="meta">Período: ${getSalesLabel().replace('VENTAS NETAS', '').trim() || 'Hoy'}</td></tr>
          <tr></tr>
          <tr>
            <td class="th">TOTAL VENTAS NETAS</td>
            <td class="total">${data.ventas}</td>
            <td style="color: green;">${data.porcentaje} de crecimiento</td>
          </tr>
          <tr></tr>
          <tr class="section"><td colspan="3">PLATOS MÁS VENDIDOS (TOP 3)</td></tr>
          <tr>
            <td class="th">Plato</td>
            <td class="th">Unidades Vendidas</td>
            <td class="th">Gráfico de Barras</td>
          </tr>
          ${data.platos.map(p => {
            const pctVal = parseFloat(p.pct) || 0;
            const blocks = Math.round(pctVal / 10);
            const bar = '█'.repeat(Math.max(0, blocks)) + '░'.repeat(Math.max(0, 10 - blocks));
            return `
              <tr>
                <td class="td">${p.nombre}</td>
                <td class="td" align="right">${p.u}</td>
                <td class="td" style="font-family: monospace; color: #B3401B;">${bar} (${p.pct})</td>
              </tr>
            `;
          }).join('')}
          <tr></tr>
          <tr class="section"><td colspan="3">HORAS PICO DE VENTAS (GRÁFICO)</td></tr>
          <tr>
            <td class="th">Hora</td>
            <td class="th">Gráfico de Barras</td>
            <td class="th">Porcentaje / Nota</td>
          </tr>
          ${hourBars.map(h => `
            <tr>
              <td class="td">${h.label}</td>
              <td class="td" style="font-family: monospace; color: #48729A;">${h.bar}</td>
              <td class="td">${h.pct} ${h.note ? `<b style="color: #B3401B;">${h.note}</b>` : ''}</td>
            </tr>
          `).join('')}
          <tr></tr>
          <tr class="section"><td colspan="3">${getClientRankingLabel().toUpperCase()}</td></tr>
          <tr>
            <td class="th">Cliente</td>
            <td class="th">Consumo</td>
            <td class="th">Cantidad Pedidos</td>
          </tr>
          ${data.clientes.map(c => `
            <tr>
              <td class="td">${c.nombre}</td>
              <td class="td" align="right">${c.consumo}</td>
              <td class="td" align="right">${c.pedidos}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Dashboard_${activeTab}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors">
          <Menu className="w-8 h-8" strokeWidth={2.5} />
        </button>
        <div className="flex-1 px-4">
          <h1 className="text-2xl font-bold leading-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 italic">Gestión y Sabor (BI)</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-[#F4EFE6] rounded-full border border-gray-800 flex items-center justify-center overflow-hidden">
            <User className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] text-gray-800 mt-1">{userName}</span>
        </div>
      </div>

      <div className="px-6 pb-24 space-y-6 flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="bg-white rounded-full p-1.5 flex shadow-sm mb-6 relative z-10">
          <button
            onClick={() => { setActiveTab('hoy'); setIsCalendarOpen(false); }}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 ${
              activeTab === 'hoy' && !isCalendarOpen ? 'bg-[#B3401B] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 ${
              activeTab === 'rango' || isCalendarOpen ? 'bg-[#B3401B] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Filtrar por fecha
          </button>
          <button
            onClick={() => { setActiveTab('mes'); setIsCalendarOpen(false); }}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 ${
              activeTab === 'mes' && !isCalendarOpen ? 'bg-[#B3401B] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Este Mes
          </button>
          
          {/* Calendar Popover */}
          {isCalendarOpen && (
            <DateRangePicker 
              onRangeSelected={handleRangeSelected} 
              onClose={() => setIsCalendarOpen(false)} 
            />
          )}
        </div>

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-[#B3401B] animate-spin" />
            <span className="text-sm text-gray-500 font-medium">Cargando datos del dashboard...</span>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 text-red-600 rounded-2xl p-6 text-center shadow-sm">
            <p className="font-bold text-sm mb-2">Hubo un error al cargar la información</p>
            <p className="text-xs mb-4">{error}</p>
            <button 
              onClick={fetchDashboardData} 
              className="bg-[#B3401B] text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md hover:bg-[#8A3114] transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : data ? (
          <>
            {/* Net Sales */}
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">{getSalesLabel()}</h3>
              <div className="flex items-center justify-center gap-3 transition-opacity duration-300">
                <span className="text-4xl font-bold text-[#B3401B] tracking-tight">{data.ventas}</span>
                <div className="flex items-center text-green-600">
                  <ArrowUp className="w-4 h-4 mr-1" strokeWidth={3} />
                  <span className="text-sm font-bold">({data.porcentaje})</span>
                </div>
              </div>
            </div>

            {/* Top Selling Dishes */}
            <div className="bg-[#48729A] rounded-2xl p-5 text-white shadow-md">
              <h3 className="text-sm mb-4">Platos Más Vendidos (Top 3)</h3>
              <div className="space-y-4">
                {data.platos.length === 0 ? (
                  <p className="text-center text-xs text-white/70 py-4">No hay ventas registradas en este periodo.</p>
                ) : (
                  data.platos.map((plato, idx) => (
                    <div key={idx} className="flex items-center gap-4 transition-all duration-500">
                      <span className="text-sm w-32 font-medium truncate">{plato.nombre}</span>
                      <div className="flex-1 flex h-2.5 bg-[#F4EFE6] rounded-full overflow-hidden">
                        <div className="bg-[#B3401B] transition-all duration-1000 ease-out" style={{ width: plato.pct }}></div>
                      </div>
                      <span className="text-xs w-10 text-right">{plato.u} u.</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-[#48729A] rounded-2xl p-5 shadow-md">
              <h3 className="text-sm text-white mb-8 text-center font-medium">Horas Pico de Ventas</h3>
              <div className="relative h-32 flex items-end justify-around px-2">
                {/* Tooltip for Peak */}
                {data.horas.barras.some(h => h !== '0%' && h !== '10%') && (
                  <div 
                    className="absolute top-2 -translate-x-1/2 bg-[#F4EFE6] text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap z-10 transition-all duration-500"
                    style={{ left: `calc((100% / 7) * ${data.horas.picoIndex} + (100% / 14))` }}
                  >
                    Pico: {data.horas.pico}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#F4EFE6] rotate-45"></div>
                  </div>
                )}

                {/* Bars */}
                {data.horas.barras.map((height, idx) => (
                  <div 
                    key={idx} 
                    className={`w-6 rounded-t-sm transition-all duration-1000 ease-out ${idx === data.horas.picoIndex ? 'bg-[#B3401B] relative z-0' : 'bg-[#F4EFE6]'}`} 
                    style={{ height }}
                  ></div>
                ))}
              </div>
              <div className="flex justify-around text-[10px] text-white mt-3 px-2 font-medium">
                {X_AXIS_LABELS.map((label, idx) => (
                  <span key={idx} className="w-6 text-center">{label}</span>
                ))}
              </div>
            </div>

            {/* Client Ranking */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-6 text-center">{getClientRankingLabel()}</h3>
              
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 mb-4 text-[11px] font-bold text-gray-800 uppercase tracking-wider text-center">
                <span className="text-left">Cliente</span>
                <span>Consumo</span>
                <span>Pedidos</span>
              </div>

              <div className="space-y-4">
                {data.clientes.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No hay consumos registrados para clientes en este periodo.</p>
                ) : (
                  data.clientes.map((cliente, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center text-center transition-opacity duration-300">
                      <div className="flex items-center gap-2 text-left overflow-hidden">
                        <div className="w-7 h-7 shrink-0 bg-transparent border-2 border-gray-800 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-800" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate">{cliente.nombre}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-800">{cliente.consumo}</span>
                      <span className="text-xs font-medium text-gray-800">{cliente.pedidos}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button 
                onClick={handleDownloadPDF}
                className="bg-[#B3401B] text-white rounded-xl py-3 px-2 flex items-center justify-center gap-2 text-[11px] font-bold shadow-md hover:bg-[#8A3114] transition-colors"
              >
                DESCARGAR PDF
                <FileDown className="w-4 h-4" />
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-[#CDE8D4] text-gray-800 rounded-xl py-3 px-2 flex items-center justify-center gap-2 text-[11px] font-bold shadow-md hover:bg-[#B5DAC0] transition-colors"
              >
                EXPORTAR EXCEL
                <Sheet className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
