import { PageHeader } from '../components/PageHeader';
import { cn } from '../lib/utils';

const BASE = import.meta.env.BASE_URL;
const IFRAME_SRC = `${BASE}ExtendedGridSupport.html?theme=light`;
const STANDALONE_HTML = `${BASE}ExtendedGridSupport.html`;

export default function CalculateMovement() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pb-3 pt-2 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title="Calculate Movement"
            description="Công cụ calculateMovement / Extended Grid Support (nhúng từ static HTML)."
          />
          <a
            href={STANDALONE_HTML}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium',
              'ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            Mở tab mới (full page)
          </a>
        </div>
      </div>
      <iframe
        title="Movement calculator — extended grids"
        src={IFRAME_SRC}
        className="min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
}
