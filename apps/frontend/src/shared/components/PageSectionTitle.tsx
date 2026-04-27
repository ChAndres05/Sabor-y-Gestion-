interface PageSectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function PageSectionTitle({
  title,
  subtitle,
}: PageSectionTitleProps) {
  return (
    <div>
      <h1 className="text-subtitle font-semibold text-text">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}