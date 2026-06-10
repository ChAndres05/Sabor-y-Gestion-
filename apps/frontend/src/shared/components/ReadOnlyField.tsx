interface ReadOnlyFieldProps {
  label: string;
  value: string;
}

export default function ReadOnlyField({
  label,
  value,
}: ReadOnlyFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-text">
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 outline-none"
      />
    </div>
  );
}