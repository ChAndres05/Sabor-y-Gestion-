import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  label: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  label,
  className = '',
  ...props
}) => {
  const baseStyles =
    'w-full rounded-full px-6 py-3 font-bold text-content transition-all active:scale-95 shadow-md disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'bg-secondary text-white hover:opacity-90',
    outline: 'bg-white text-text border border-gray-200 hover:bg-gray-50',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {label}
    </button>
  );
};