import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  onRangeSelected: (range: string) => void;
  onClose: () => void;
}

export default function DateRangePicker({ onRangeSelected, onClose }: DateRangePickerProps) {
  // Hardcoded for the mock design to match exactly "Octubre 2023" and the specific range layout.
  // In a real application, this would use Date objects and a library like date-fns.
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // 35 days grid (5 weeks)
  const calendarDays = [
    { day: 29, isCurrentMonth: false }, { day: 30, isCurrentMonth: false }, { day: 31, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true }, { day: 2, isCurrentMonth: true }, { day: 3, isCurrentMonth: true }, { day: 4, isCurrentMonth: true },
    { day: 5, isCurrentMonth: true }, { day: 6, isCurrentMonth: true }, { day: 7, isCurrentMonth: true }, { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true }, { day: 10, isCurrentMonth: true }, { day: 11, isCurrentMonth: true },
    { day: 12, isCurrentMonth: true }, { day: 13, isCurrentMonth: true }, { day: 14, isCurrentMonth: true }, { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true }, { day: 17, isCurrentMonth: true }, { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true }, { day: 20, isCurrentMonth: true }, { day: 21, isCurrentMonth: true }, { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true }, { day: 24, isCurrentMonth: true }, { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true }, { day: 27, isCurrentMonth: true }, { day: 28, isCurrentMonth: true }, { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true }, { day: 1, isCurrentMonth: false }, { day: 2, isCurrentMonth: false }
  ];

  const [selectedRange, setSelectedRange] = useState<{ start: number | null, end: number | null }>({
    start: 12,
    end: 18
  });

  const handleDayClick = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    
    if (selectedRange.start === null || (selectedRange.start !== null && selectedRange.end !== null)) {
      setSelectedRange({ start: day, end: null });
    } else if (day >= selectedRange.start) {
      setSelectedRange({ ...selectedRange, end: day });
    } else {
      setSelectedRange({ start: day, end: null });
    }
  };

  const handleAccept = () => {
    if (selectedRange.start && selectedRange.end) {
      onRangeSelected(`${selectedRange.start} - ${selectedRange.end} Octubre`);
      onClose();
    }
  };

  const isSelected = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    if (selectedRange.start === day) return true;
    if (selectedRange.end === day) return true;
    if (selectedRange.start && selectedRange.end && day > selectedRange.start && day < selectedRange.end) return true;
    return false;
  };

  const isRangeStart = (day: number, isCurrentMonth: boolean) => isCurrentMonth && selectedRange.start === day;
  const isRangeEnd = (day: number, isCurrentMonth: boolean) => isCurrentMonth && selectedRange.end === day;
  const isInRange = (day: number, isCurrentMonth: boolean) => isCurrentMonth && selectedRange.start && selectedRange.end && day > selectedRange.start && day < selectedRange.end;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[320px] font-sans absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        <button className="text-gray-400 hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-gray-800">Octubre 2023</span>
        <button className="text-gray-400 hover:text-gray-800 transition-colors">
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
          const selected = isSelected(d.day, d.isCurrentMonth);
          const start = isRangeStart(d.day, d.isCurrentMonth);
          const end = isRangeEnd(d.day, d.isCurrentMonth);
          const inRange = isInRange(d.day, d.isCurrentMonth);

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
                onClick={() => handleDayClick(d.day, d.isCurrentMonth)}
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
        <span>Rango seleccionado: {selectedRange.start} - {selectedRange.end || '...'} Octubre</span>
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
