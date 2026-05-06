import type { Zone, ZoneFilter } from '../types/table.types';

interface ZoneFilterChipsProps {
  zones: Zone[];
  selectedZoneId: ZoneFilter;
  onSelectZone: (zoneId: ZoneFilter) => void;
  onDeleteZone?: (zone: Zone) => void;
}

export function ZoneFilterChips({
  zones,
  selectedZoneId,
  onSelectZone,
  onDeleteZone,
}: ZoneFilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 items-center">
      <button
        type="button"
        onClick={() => onSelectZone('ALL')}
        className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
          selectedZoneId === 'ALL'
            ? 'bg-primary text-white'
            : 'bg-white text-text'
        }`}
      >
        Todas
      </button>

      {zones.map((zone) => (
        <div key={zone.id} className="relative group shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => onSelectZone(zone.id)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${onDeleteZone ? 'pr-8' : ''} ${
              selectedZoneId === zone.id
                ? 'bg-primary text-white'
                : 'bg-white text-text'
            }`}
          >
            {zone.nombre}
          </button>
          
          {onDeleteZone && (
            <button
              type="button"
              onClick={() => onDeleteZone(zone)}
              className={`absolute right-2 h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                selectedZoneId === zone.id 
                  ? 'bg-white/20 hover:bg-white/40 text-white' 
                  : 'bg-black/5 hover:bg-black/10 text-gray-500'
              }`}
              aria-label="Eliminar zona"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}