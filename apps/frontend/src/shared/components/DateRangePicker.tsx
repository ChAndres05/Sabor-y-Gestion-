import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  onRangeSelected: (start: Date, end: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DateRangePicker({ onRangeSelected, onClose }: DateRangePickerProps) {
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Current viewed month/year in the calendar view
  const [viewDate, setViewDate] = useState<Date>(new Date());
  
  // Selected range
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null, end: Date | null }>({
    start: null,
    end: null
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Generate the calendar days:
  // Day of week of the first day of month (0 = Sunday, 6 = Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Total days in previous month
  const prevTotalDays = new Date(year, month, 0).getDate();

  const calendarDays: { day: number; date: Date; isCurrentMonth: boolean }[] = [];

  // 1. Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDay = prevTotalDays - i;
    const prevDate = new Date(year, month - 1, prevDay);
    calendarDays.push({
      day: prevDay,
      date: prevDate,
      isCurrentMonth: false
    });
  }

  // 2. Current month days
  for (let day = 1; day <= totalDays; day++) {
    const currDate = new Date(year, month, day);
    calendarDays.push({
      day,
      date: currDate,
      isCurrentMonth: true
    });
  }

  // 3. Next month padding
  const totalCells = calendarDays.length > 35 ? 42 : 35;
  const nextMonthPadding = totalCells - calendarDays.length;
  for (let day = 1; day <= nextMonthPadding; day++) {
    const nextDate = new Date(year, month + 1, day);
    calendarDays.push({
      day,
      date: nextDate,
      isCurrentMonth: false
    });
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    // Zero-out time part of the clicked date for accurate day-level calculations
    const cleanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (selectedRange.start === null || (selectedRange.start !== null && selectedRange.end !== null)) {
      setSelectedRange({ start: cleanDate, end: null });
    } else if (cleanDate >= selectedRange.start) {
      setSelectedRange({ ...selectedRange, end: cleanDate });
    } else {
      setSelectedRange({ start: cleanDate, end: null });
    }
  };

  const isSelected = (date: Date) => {
    const cleanTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startTime = selectedRange.start ? selectedRange.start.getTime() : null;
    const endTime = selectedRange.end ? selectedRange.end.getTime() : null;

    if (startTime === cleanTime) return true;
    if (endTime === cleanTime) return true;
    if (startTime && endTime && cleanTime > startTime && cleanTime < endTime) return true;
    return false;
  };

  const isRangeStart = (date: Date) => {
    if (!selectedRange.start) return false;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() === selectedRange.start.getTime();
  };

  const isRangeEnd = (date: Date) => {
    if (!selectedRange.end) return false;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() === selectedRange.end.getTime();
  };

  const isInRange = (date: Date) => {
    if (!selectedRange.start || !selectedRange.end) return false;
    const cleanTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return cleanTime > selectedRange.start.getTime() && cleanTime < selectedRange.end.getTime();
  };

  const handleAccept = () => {
    if (selectedRange.start && selectedRange.end) {
      onRangeSelected(selectedRange.start, selectedRange.end);
      onClose();
    }
  };

  const formatDateLabel = (d: Date | null) => {
    if (!d) return '...';
    return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[320px] font-sans absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        <button onClick={handlePrevMonth} className="text-gray-400 hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-gray-800">{MONTH_NAMES[month]} {year}</span>
        <button onClick={handleNextMonth} className="text-gray-400 hover:text-gray-800 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-y-2 mb-2 text-center">
        {daysOfWeek.map((day, idx) => (
          <div key={idx} className="text-xs font-bold text-gray-800">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-2 text-center">
        {calendarDays.map((d, idx) => {
          const selected = isSelected(d.date);
          const start = isRangeStart(d.date);
          const end = isRangeEnd(d.date);
          const inRange = isInRange(d.date);

          let bgClass = "bg-transparent";
          let textClass = d.isCurrentMonth ? "text-gray-800" : "text-gray-300";
          let roundedClass = "rounded-full";

          if (selected) {
            bgClass = "bg-[#B3401B]";
            textClass = "text-white";
            
            if (start && !selectedRange.end) {
              // Keep default full rounded
            } else if (start) {
              roundedClass = "rounded-l-full";
            } else if (end) {
              roundedClass = "rounded-r-full";
            } else if (inRange) {
              roundedClass = "rounded-none";
            }
          }

          return (
            <div key={idx} className="relative py-1">
              {/* Background extension for connecting the range visually */}
              {start && selectedRange.end && (
                <div className="absolute top-1 bottom-1 right-0 w-1/2 bg-[#B3401B] -z-10"></div>
              )}
              {inRange && (
                <div className="absolute top-1 bottom-1 left-0 right-0 bg-[#B3401B] -z-10"></div>
              )}
              {end && selectedRange.start && (
                <div className="absolute top-1 bottom-1 left-0 w-1/2 bg-[#B3401B] -z-10"></div>
              )}
              
              <button
                onClick={() => handleDayClick(d.date)}
                className={`w-8 h-8 mx-auto flex items-center justify-center text-sm font-medium transition-colors z-10 ${bgClass} ${textClass} ${roundedClass} ${
                  !selected && d.isCurrentMonth ? "hover:bg-gray-100 rounded-full" : ""
                }`}
              >
                {d.day}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-500 font-medium border-t border-gray-100 pt-3 flex flex-col gap-3">
        <span>Rango seleccionado: {formatDateLabel(selectedRange.start)} - {formatDateLabel(selectedRange.end)}</span>
        <button 
          onClick={handleAccept}
          disabled={!selectedRange.end}
          className={`w-full py-2 rounded-xl text-sm font-bold transition-colors shadow-sm ${
            selectedRange.end ? 'bg-[#B3401B] text-white hover:bg-[#8A3114]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
