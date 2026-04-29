import type { ReactNode } from 'react';

type FeedbackType = 'success' | 'error' | 'info';

interface FeedbackModalProps {
  open: boolean;
  title: string;
  message: string;
  type?: FeedbackType;
  confirmLabel?: string;
  onClose: () => void;
  icon?: ReactNode;
}

function getTypeStyles(type: FeedbackType) {
  switch (type) {
    case 'success':
      return {
        badge: 'bg-success/10 text-success',
        button: 'bg-primary text-white hover:bg-primary-hover',
      };
    case 'error':
      return {
        badge: 'bg-alert/10 text-alert',
        button: 'bg-primary text-white hover:bg-primary-hover',
      };
    default:
      return {
        badge: 'bg-info/10 text-info',
        button: 'bg-primary text-white hover:bg-primary-hover',
      };
  }
}

export function FeedbackModal({
  open,
  title,
  message,
  type = 'info',
  confirmLabel = 'Confirmar',
  onClose,
  icon,
}: FeedbackModalProps) {
  if (!open) return null;

  const styles = getTypeStyles(type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[360px] rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[24px] ${styles.badge}`}
        >
          {icon ?? (type === 'success' ? '✓' : type === 'error' ? '!' : 'i')}
        </div>

        <h3 className="mt-4 text-[20px] font-bold text-text">{title}</h3>

        <p className="mt-3 text-[14px] leading-6 text-gray-500">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className={`mt-6 w-full rounded-2xl px-5 py-3 text-[14px] font-semibold transition-colors ${styles.button}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}