import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'outline' | 'danger';

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export default function BaseButton({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: BaseButtonProps) {
  const baseClasses =
    'rounded-2xl px-6 py-3 text-[16px] font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

  const widthClass = fullWidth ? 'w-full' : '';

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    outline: 'border border-gray-300 bg-white text-text hover:bg-gray-50',
    danger: 'bg-alert text-white hover:opacity-90',
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${widthClass} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}