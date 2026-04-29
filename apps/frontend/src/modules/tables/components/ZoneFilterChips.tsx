import type { Zone, ZoneFilter } from '../types/table.types';

interface ZoneFilterChipsProps {
  zones: Zone[];
  selectedZoneId: ZoneFilter;
  onSelectZone: (zoneId: ZoneFilter) => void;
}

export function ZoneFilterChips({
  zones,
  selectedZoneId,
  onSelectZone,
}: ZoneFilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
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
        <button
          key={zone.id}
          type="button"
          onClick={() => onSelectZone(zone.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
            selectedZoneId === zone.id
              ? 'bg-primary text-white'
              : 'bg-white text-text'
          }`}
        >
          {zone.nombre}
        </button>
      ))}
    </div>
  );
}