import { useMemo, useState } from 'react';
import { filesService } from '../../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface AtlasImageItem {
  path: string;
  name: string;
}

interface AtlasBuilderModalProps {
  images: AtlasImageItem[];
  onClose: () => void;
  onCreated: (result: {
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  }) => void;
}

export function AtlasBuilderModal({ images, onClose, onCreated }: AtlasBuilderModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(
    () => images.filter((img) => !selected.includes(img.path)),
    [images, selected]
  );

  const isValidName = /^[a-zA-Z0-9_-]{1,50}$/.test(name.trim());
  const canSubmit = isValidName && selected.length > 0 && !submitting;

  const handleAdd = (path: string) => {
    setSelected((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  const handleRemove = (path: string) => {
    setSelected((prev) => prev.filter((p) => p !== path));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const path = e.dataTransfer.getData('text/plain');
    if (path) {
      handleAdd(path);
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !isValidName) {
      setError('Tên atlas không hợp lệ (chỉ a-z, A-Z, 0-9, -, _)');
      return;
    }
    if (selected.length === 0) {
      setError('Hãy chọn ít nhất một ảnh để tạo atlas.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const result = await filesService.generateCustomAtlas(selected, trimmed);
      onCreated(result);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Tạo atlas thất bại';
      setError(msg || 'Tạo atlas thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-5xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Tạo Atlas tùy chỉnh
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Kéo thả hoặc chọn các ảnh để tạo một atlas mới. Nhập tên file atlas trước khi tạo.
            </p>
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-1">
                Ảnh trong atlas ({selected.length})
              </label>
              <div
                className="min-h-[220px] max-h-[360px] overflow-y-auto rounded-lg border border-dashed border-border bg-muted p-3 flex flex-wrap gap-2 content-start"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {selected.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Kéo ảnh từ danh sách bên phải hoặc click để thêm.
                  </p>
                )}
                {selected.map((path) => {
                  const img = images.find((i) => i.path === path);
                  if (!img) return null;
                  return (
                    <div
                      key={path}
                      className="relative w-20 h-28 rounded-md border border-border bg-background overflow-hidden flex flex-col"
                    >
                      <div className="relative h-20 w-full">
                        <img
                          src={img.path}
                          alt={img.name}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-1 py-0.5">
                          <span className="block truncate text-[10px] text-white">
                            {img.name}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-[10px] text-white"
                        onClick={() => handleRemove(path)}
                      >
                        ✕
                      </button>
                      <span className="mt-auto truncate px-1 pb-1 text-[10px] text-muted-foreground">
                        {img.path}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full md:w-72 shrink-0">
              <label className="block text-sm font-medium mb-1">
                Ảnh có sẵn ({available.length})
              </label>
              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
                {available.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tất cả ảnh hiện đã nằm trong atlas.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {available.map((img) => (
                    <div
                      key={img.path}
                      className="group cursor-pointer rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary/60 overflow-hidden"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', img.path);
                      }}
                      onClick={() => handleAdd(img.path)}
                    >
                      <img
                        src={img.path}
                        alt={img.name}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="px-1 py-1">
                        <p className="truncate text-[10px] text-muted-foreground">
                          {img.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium">
                  Tên file atlas (không cần .webp)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="vd: my-custom-atlas"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Chỉ cho phép chữ, số, gạch ngang và gạch dưới. File sẽ được lưu thành{' '}
                  <span className="font-mono">{name || 'ten-atlas'}.webp</span> và{' '}
                  <span className="font-mono">{name || 'ten-atlas'}.json</span>.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={!canSubmit}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo atlas'}
                </Button>
              </div>
            </div>
            {error && (
              <p className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

