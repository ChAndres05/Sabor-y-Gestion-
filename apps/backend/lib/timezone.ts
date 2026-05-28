/**
 * Helper para obtener la fecha/hora actual en la zona horaria de Bolivia (UTC-4).
 * 
 * Prisma envía el valor UTC interno del objeto Date a PostgreSQL para columnas
 * `timestamp without time zone`. Para que la BD almacene la hora de Bolivia,
 * construimos un Date que internamente represente la hora boliviana.
 * 
 * Bolivia = UTC - 4 horas (sin horario de verano).
 */
export function nowBolivia(): Date {
  // Usar Intl.DateTimeFormat para obtener la hora exacta de Bolivia
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  
  // Construir un string ISO SIN zona horaria para que Prisma lo envíe tal cual
  const isoString = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000Z`;
  
  return new Date(isoString);
}
