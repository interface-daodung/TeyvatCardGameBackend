interface PageHeaderProps {
  title: string;
  description?: string;
}

/** Gradient trải theo chiều chữ (w-fit) + màu tương phản rõ (slate-700 → blue-500) */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="w-fit text-4xl font-bold bg-gradient-to-r from-slate-700 to-blue-500 bg-clip-text text-transparent mb-2">
        {title}
      </h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
