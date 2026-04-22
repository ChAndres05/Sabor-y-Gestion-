import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full mb-4">
      <label className="text-text font-bold text-[14px] uppercase tracking-wider">
        {label}
      </label>
      <input
        className={`p-3 border rounded-xl outline-none transition-all focus:border-primary bg-white ${
          error ? 'border-alert' : 'border-gray-200'
        }`}
        {...props}
      />
      {error && <span className="text-alert text-xs italic">{error}</span>}
    </div>
  );
};