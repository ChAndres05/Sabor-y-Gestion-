import type { ReactNode } from 'react';

interface BaseModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}

export default function BaseModal({
  open,
  title,
  onClose,
  children,
  maxWidthClassName = 'max-w-[360px]',
}: BaseModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div
        className={`relative w-full ${maxWidthClassName} rounded-[2rem] bg-white p-6 shadow-2xl`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[18px] font-bold text-text transition-colors hover:text-primary"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {title && (
          <h3 className="mb-6 pr-8 text-center text-subtitle font-semibold text-text">
            {title}
          </h3>
        )}

        {children}
      </div>
    </div>
  );
}