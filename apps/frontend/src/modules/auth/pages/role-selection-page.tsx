import { useNavigate } from 'react-router-dom';

export interface RoleSelectionOption {
  key: string;
  title: string;
  description: string;
  route: string;
}

interface RoleSelectionPageProps {
  title?: string;
  subtitle?: string;
  options?: RoleSelectionOption[];
  onOptionClick?: (option: RoleSelectionOption) => void;
}

const DEFAULT_OPTIONS: RoleSelectionOption[] = [
  {
    key: 'admin',
    title: 'Administración',
    description: 'Acceder al panel administrativo del sistema.',
    route: '/admin',
  },
  {
    key: 'mesero',
    title: 'Mesero',
    description: 'Ingresar al flujo visual de mesas y atención.',
    route: '/mesas',
  },
  {
    key: 'caja',
    title: 'Caja',
    description: 'Entrar al entorno de caja y cobros.',
    route: '/caja',
  },
  {
    key: 'cocina',
    title: 'Cocina',
    description: 'Ver el monitor de preparación y pedidos.',
    route: '/cocina/monitor',
  },
];

export const RoleSelectionPage = ({
  title = 'Selección de entorno',
  subtitle = 'Elige el módulo visual al que deseas ingresar.',
  options = DEFAULT_OPTIONS,
  onOptionClick,
}: RoleSelectionPageProps) => {
  const navigate = useNavigate();

  const handleClick = (option: RoleSelectionOption) => {
    onOptionClick?.(option);
    navigate(option.route);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '32px 20px',
        background:
          'linear-gradient(180deg, #fff7ed 0%, #fffbeb 50%, #ffffff 100%)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
        }}
      >
        <header style={{ marginBottom: '24px' }}>
          <p
            style={{
              margin: 0,
              color: '#9a3412',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Acceso visual
          </p>

          <h1
            style={{
              marginTop: '12px',
              marginBottom: '8px',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#111827',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: 0,
              color: '#6b7280',
              maxWidth: '700px',
              lineHeight: 1.6,
              fontSize: '1rem',
            }}
          >
            {subtitle}
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleClick(option)}
              style={{
                width: '100%',
                border: '1px solid #fed7aa',
                borderRadius: '18px',
                padding: '20px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.06)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  marginBottom: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#c2410c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Módulo
              </span>

              <h2
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  color: '#111827',
                }}
              >
                {option.title}
              </h2>

              <p
                style={{
                  marginTop: '10px',
                  marginBottom: 0,
                  color: '#6b7280',
                  lineHeight: 1.5,
                  fontSize: '0.95rem',
                }}
              >
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

export default RoleSelectionPage;