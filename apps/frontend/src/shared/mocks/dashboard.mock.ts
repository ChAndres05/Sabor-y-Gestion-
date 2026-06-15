export interface PlatoVendido {
  nombre: string;
  u: number;
  pct: string;
}

export interface HoraPico {
  pico: string;
  picoIndex: number;
  barras: string[];
}

export interface MeseroRendimiento {
  nombre: string;
  ventas: string;
  pedidos: number;
}

export interface DashboardData {
  ventas: string;
  porcentaje: string;
  platos: PlatoVendido[];
  horas: HoraPico;
  meseros: MeseroRendimiento[];
}

export const DASHBOARD_MOCK_DATA: Record<string, DashboardData> = {
  hoy: {
    ventas: '$3,475.20',
    porcentaje: '+12%',
    platos: [
      { nombre: 'Carpaccio de Res', u: 120, pct: '80%' },
      { nombre: 'Salmón al Horno', u: 90, pct: '60%' },
      { nombre: 'Pique Macho', u: 60, pct: '45%' }
    ],
    horas: {
      pico: '01 PM',
      picoIndex: 3,
      barras: ['25%', '45%', '60%', '90%', '55%', '40%', '25%']
    },
    meseros: [
      { nombre: 'Juan Gómez', ventas: '$345.20', pedidos: 30 },
      { nombre: 'Ana Pérez', ventas: '$152.20', pedidos: 20 },
      { nombre: 'Luis Díaz', ventas: '$35.30', pedidos: 10 }
    ]
  },
  semana: {
    ventas: '$24,580.50',
    porcentaje: '+8%',
    platos: [
      { nombre: 'Pique Macho', u: 540, pct: '85%' },
      { nombre: 'Lomo Saltado', u: 420, pct: '65%' },
      { nombre: 'Carpaccio de Res', u: 310, pct: '50%' }
    ],
    horas: {
      pico: '02 PM',
      picoIndex: 4,
      barras: ['30%', '50%', '70%', '85%', '95%', '60%', '35%']
    },
    meseros: [
      { nombre: 'Ana Pérez', ventas: '$2,450.00', pedidos: 180 },
      { nombre: 'Juan Gómez', ventas: '$2,100.50', pedidos: 150 },
      { nombre: 'Luis Díaz', ventas: '$1,850.30', pedidos: 110 }
    ]
  },
  mes: {
    ventas: '$98,400.00',
    porcentaje: '+15%',
    platos: [
      { nombre: 'Pique Macho', u: 2100, pct: '90%' },
      { nombre: 'Chicharrón', u: 1850, pct: '75%' },
      { nombre: 'Salmón al Horno', u: 1500, pct: '60%' }
    ],
    horas: {
      pico: '01 PM',
      picoIndex: 3,
      barras: ['40%', '60%', '80%', '100%', '75%', '50%', '30%']
    },
    meseros: [
      { nombre: 'Juan Gómez', ventas: '$9,800.00', pedidos: 650 },
      { nombre: 'Luis Díaz', ventas: '$8,450.00', pedidos: 520 },
      { nombre: 'Ana Pérez', ventas: '$7,900.20', pedidos: 480 }
    ]
  },
  rango: {
    ventas: '$15,200.30',
    porcentaje: '+5%',
    platos: [
      { nombre: 'Milanesa', u: 250, pct: '70%' },
      { nombre: 'Pique Macho', u: 180, pct: '55%' },
      { nombre: 'Sopa de Maní', u: 120, pct: '40%' }
    ],
    horas: {
      pico: '12 PM',
      picoIndex: 2,
      barras: ['50%', '75%', '100%', '60%', '40%', '30%', '20%']
    },
    meseros: [
      { nombre: 'Luis Díaz', ventas: '$1,500.00', pedidos: 85 },
      { nombre: 'Juan Gómez', ventas: '$1,200.20', pedidos: 70 },
      { nombre: 'Ana Pérez', ventas: '$950.00', pedidos: 55 }
    ]
  }
};
