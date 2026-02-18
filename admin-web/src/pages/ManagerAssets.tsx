import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { FileTreeNode } from '../components/FileTreeNode';
import { filesService, type FileTreeItem } from '../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

function buildCombinedTree(cardsTree: FileTreeItem[], uploadedTree: FileTreeItem[]): FileTreeItem {
  return {
    name: 'assets',
    path: '',
    type: 'dir',
    children: [
      { name: 'cards', path: '/assets/images/cards', type: 'dir', children: cardsTree },
      { name: 'uploaded', path: '/uploads', type: 'dir', children: uploadedTree },
    ],
  };
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[/\\]/, '');
}

function dirname(filePath: string): string {
  const i = filePath.replace(/\\/g, '/').lastIndexOf('/');
  return i <= 0 ? filePath : filePath.slice(0, i);
}

export default function ManagerAssets() {
  const [combinedTree, setCombinedTree] = useState<FileTreeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['', '/assets/images/cards', '/uploads']));
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPath, setEditPath] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const fetchTrees = useCallback(async () => {
    try {
      setLoading(true);
      const [cardsTree, uploadedTree] = await Promise.all([
        filesService.getImageTree(),
        filesService.getUploadedTree(),
      ]);
      setCombinedTree(buildCombinedTree(cardsTree, uploadedTree));
    } catch (err) {
      console.error('Failed to fetch file trees:', err);
      setCombinedTree(
        buildCombinedTree([], [])
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadError(null);
    setUploading(true);
    try {
      await filesService.uploadImage(file);
      await fetchTrees();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Upload thất bại';
      setUploadError(msg || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const isImagePath = (path: string) =>
    /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(path);

  const openEditModal = (filePath: string) => {
    setEditPath(filePath);
    setEditName(basename(filePath));
    setEditError(null);
    setEditModalOpen(true);
  };

  const isUploadedFile = (p: string) =>
    p.startsWith('/uploads/') && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);
  const isCardFile = (p: string) =>
    p.startsWith('/assets/images/cards/') && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);
  const canRename = editPath !== null && (isUploadedFile(editPath) || isCardFile(editPath));
  const canDelete = editPath !== null && (isUploadedFile(editPath) || isCardFile(editPath));

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditPath(null);
    setEditName('');
    setEditError(null);
    setDeleteConfirmOpen(false);
  };

  const handleRename = async () => {
    if (!editPath || !editName.trim()) return;
    const current = basename(editPath);
    const ext = current.includes('.') ? current.slice(current.lastIndexOf('.')) : '';
    const newName = editName.trim().includes('.') ? editName.trim() : editName.trim() + ext;
    if (newName === current) {
      closeEditModal();
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      if (isUploadedFile(editPath)) {
        await filesService.renameUploaded(current, newName);
        await fetchTrees();
        if (selectedPath === editPath) setSelectedPath(`/uploads/${newName}`);
      } else if (isCardFile(editPath)) {
        const res = await filesService.renameCardFile(editPath, newName);
        await fetchTrees();
        if (selectedPath === editPath) setSelectedPath(res.imageUrl);
      } else {
        setEditError('Chỉ có thể đổi tên file trong thư mục uploaded hoặc cards.');
        setEditSaving(false);
        return;
      }
      closeEditModal();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Đổi tên thất bại';
      setEditError(msg || 'Đổi tên thất bại');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteClick = () => setDeleteConfirmOpen(true);
  const handleDeleteConfirm = async () => {
    if (!editPath) return;
    setEditSaving(true);
    setEditError(null);
    try {
      if (isUploadedFile(editPath)) {
        await filesService.deleteUploaded(basename(editPath));
      } else if (isCardFile(editPath)) {
        await filesService.deleteCardFile(editPath);
      } else {
        setEditError('Chỉ có thể xóa file trong thư mục uploaded hoặc cards.');
        setEditSaving(false);
        setDeleteConfirmOpen(false);
        return;
      }
      await fetchTrees();
      if (selectedPath === editPath) setSelectedPath(null);
      closeEditModal();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Xóa file thất bại';
      setEditError(msg || 'Xóa file thất bại');
    } finally {
      setEditSaving(false);
      setDeleteConfirmOpen(false);
    }
  };

  const showEditFor = (item: FileTreeItem) => item.type === 'file';

  const isCardFolder = (p: string) =>
    p === '/assets/images/cards' || (p.startsWith('/assets/images/cards/') && p.length > '/assets/images/cards/'.length);
  const isUploadedFolder = (p: string) => p === '/uploads' || (p.startsWith('/uploads/') && p.length > '/uploads/'.length);

  const canDropOnFolder = (targetFolderPath: string, droppedFilePath: string): boolean => {
    const parent = dirname(droppedFilePath);
    const sameParent = targetFolderPath === parent;
    const cardFile = isCardFile(droppedFilePath);
    const cardFolder = isCardFolder(targetFolderPath);
    const uploadedFile = isUploadedFile(droppedFilePath);
    const uploadedFolder = isUploadedFolder(targetFolderPath);
    const result =
      !sameParent &&
      ((cardFile && cardFolder) ||
        (uploadedFile && uploadedFolder) ||
        (uploadedFile && cardFolder));
    return result;
  };

  const handleMoveFile = async (targetFolderPath: string, droppedFilePath: string) => {
    if (!canDropOnFolder(targetFolderPath, droppedFilePath)) return;
    setMoveError(null);
    setMoveLoading(true);
    try {
      if (isCardFile(droppedFilePath)) {
        const res = await filesService.moveCardFile(droppedFilePath, targetFolderPath);
        setMoveError(null);
        await fetchTrees();
        setExpanded((prev) => new Set(prev).add(targetFolderPath));
        if (selectedPath === droppedFilePath) setSelectedPath(res.imageUrl);
      } else if (isUploadedFile(droppedFilePath) && isCardFolder(targetFolderPath)) {
        const res = await filesService.moveUploadedToCards(basename(droppedFilePath), targetFolderPath);
        setMoveError(null);
        await fetchTrees();
        setExpanded((prev) => new Set(prev).add(targetFolderPath));
        if (selectedPath === droppedFilePath) setSelectedPath(res.imageUrl);
      } else if (isUploadedFile(droppedFilePath) && isUploadedFolder(targetFolderPath)) {
        const res = await filesService.moveUploadedFile(basename(droppedFilePath), targetFolderPath);
        setMoveError(null);
        await fetchTrees();
        setExpanded((prev) => new Set(prev).add(targetFolderPath));
        if (selectedPath === droppedFilePath) setSelectedPath(res.imageUrl);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Di chuyển thất bại';
      setMoveError(msg || 'Di chuyển thất bại');
    } finally {
      setMoveLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Manager Assets"
        description="Quản lý file ảnh: xem cây thư mục và upload ảnh lên thư mục uploaded (REST + Multer)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>File tree</CardTitle>
          </CardHeader>
          <CardContent>
            {moveError && (
              <p className="text-sm text-red-600 mb-2">{moveError}</p>
            )}
            {moveLoading && (
              <p className="text-sm text-amber-600 mb-2">Đang di chuyển...</p>
            )}
            {loading ? (
              <p className="text-muted-foreground">Đang tải cây thư mục...</p>
            ) : combinedTree?.children ? (
              <div className="border rounded-lg p-2 bg-muted/30 min-h-[320px] max-h-[60vh] overflow-y-auto">
                {combinedTree.children.map((item) => (
                  <FileTreeNode
                    key={item.path}
                    item={item}
                    expanded={expanded}
                    onToggle={handleToggle}
                    onSelect={setSelectedPath}
                    onEdit={openEditModal}
                    showEditFor={showEditFor}
                    onDropOnFolder={handleMoveFile}
                    canDropOnFolder={canDropOnFolder}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Không có dữ liệu.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload ảnh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Chọn file ảnh (.png, .jpg, .webp, …) để upload lên thư mục <strong>uploaded</strong>.
              </p>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Chọn file</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-medium hover:file:bg-primary/90"
                />
              </label>
              {uploading && <p className="text-sm text-amber-600">Đang upload...</p>}
              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            </CardContent>
          </Card>

          {selectedPath && isImagePath(selectedPath) && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={selectedPath}
                  alt="Preview"
                  className="max-w-full rounded-lg border object-contain max-h-64 bg-muted"
                />
                <p className="mt-2 text-xs text-muted-foreground break-all">{selectedPath}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {editModalOpen && editPath && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditModal}
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chỉnh sửa</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={closeEditModal}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canRename && !canDelete && (
                <p className="text-sm text-muted-foreground">
                  Có thể đổi tên và xóa file trong thư mục <strong>uploaded</strong> hoặc <strong>cards</strong>.
                </p>
              )}
              <div>
                <label className="text-sm font-medium">Tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canRename}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 disabled:bg-slate-100"
                />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRename} disabled={editSaving || !canRename}>
                  Lưu tên
                </Button>
                <Button type="button" variant="outline" onClick={handleDeleteClick} disabled={editSaving || !canDelete}>
                  Xóa file
                </Button>
                <Button type="button" variant="ghost" onClick={closeEditModal}>
                  Đóng
                </Button>
              </div>

              {deleteConfirmOpen && canDelete && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800">Bạn có chắc muốn xóa file này?</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="destructive" size="sm" onClick={handleDeleteConfirm} disabled={editSaving}>
                      Có, xóa
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
                      Không
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
