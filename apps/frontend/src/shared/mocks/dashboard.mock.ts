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

export interface ClienteRendimiento {
  nombre: string;
  consumo: string;
  pedidos: number;
}

export interface DashboardData {
  ventas: string;
  porcentaje: string;
  platos: PlatoVendido[];
  horas: HoraPico;
  clientes: ClienteRendimiento[];
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
    clientes: [
      { nombre: 'Carlos Rocha', consumo: '$345.20', pedidos: 5 },
      { nombre: 'Maria Fernandez', consumo: '$152.20', pedidos: 2 },
      { nombre: 'Jose Mendez', consumo: '$35.30', pedidos: 1 }
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
    clientes: [
      { nombre: 'Ana Fernandez', consumo: '$2,450.00', pedidos: 18 },
      { nombre: 'Carlos Rocha', consumo: '$2,100.50', pedidos: 15 },
      { nombre: 'Luis Suarez', consumo: '$1,850.30', pedidos: 11 }
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
    clientes: [
      { nombre: 'Carlos Rocha', consumo: '$9,800.00', pedidos: 65 },
      { nombre: 'Luis Suarez', consumo: '$8,450.00', pedidos: 52 },
      { nombre: 'Ana Fernandez', consumo: '$7,900.20', pedidos: 48 }
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
    clientes: [
      { nombre: 'Luis Suarez', consumo: '$1,500.00', pedidos: 8 },
      { nombre: 'Carlos Rocha', consumo: '$1,200.20', pedidos: 7 },
      { nombre: 'Ana Fernandez', consumo: '$950.00', pedidos: 5 }
    ]
  }
};
