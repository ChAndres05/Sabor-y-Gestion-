import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="mb-4 flex w-full flex-col gap-1">
      <label className="text-[14px] font-bold uppercase tracking-wider text-text">
        {label}
      </label>

      <input
        className={`rounded-xl border bg-white p-3 outline-none transition-all focus:border-primary ${
          error ? 'border-alert' : 'border-gray-200'
        } ${className}`}
        {...props}
      />

      {error && <span className="text-xs italic text-alert">{error}</span>}
    </div>
  );
};