import type { ReactNode } from 'react';

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export default function SectionCard({
  children,
  className = '',
}: SectionCardProps) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}