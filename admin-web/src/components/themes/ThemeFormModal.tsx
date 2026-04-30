import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { ImagePickerSurface } from '../ui/ImagePickerSurface';
import { filesService, type FileTreeItem } from '../../services/filesService';
import {
  type ThemeColors,
  type ThemeAssets,
  mergeThemeAssets,
} from '../../services/themeService';
import { scaleInModal, fadeInOverlay } from '../animations/motionPresets';
import { ThemePreview } from './ThemePreview';
import { generateWarmColors } from './themeColorUtils';

function findTreeNode(items: FileTreeItem[] | null, targetPath: string): FileTreeItem | null {
  if (!items) return null;
  const normalizePath = (value: string) =>
    value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const expected = normalizePath(targetPath);
  for (const item of items) {
    const normalized = normalizePath(item.path);
    if (normalized === expected) return item;
    if (item.children?.length) {
      const found = findTreeNode(item.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function filterTreeByPrefix(items: FileTreeItem[] | null, prefixPath: string): FileTreeItem[] {
  if (!items) return [];
  const normalizePath = (value: string) =>
    value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const prefix = normalizePath(prefixPath);

  const walk = (nodes: FileTreeItem[]): FileTreeItem[] => {
    const result: FileTreeItem[] = [];
    for (const node of nodes) {
      const normalized = normalizePath(node.path);
      const children = node.children?.length ? walk(node.children) : [];
      const keepSelf = normalized === prefix || normalized.startsWith(`${prefix}/`);
      if (!keepSelf && children.length === 0) continue;
      result.push({
        ...node,
        ...(children.length > 0 ? { children } : {}),
      });
    }
    return result;
  };

  return walk(items);
}

export function ThemeFormModal({
  initialName,
  initialColors,
  initialAssets,
  colorKeys,
  onClose,
  onSave,
  saveLoading,
}: {
  initialName: string;
  initialColors: ThemeColors;
  initialAssets?: ThemeAssets;
  colorKeys: (keyof ThemeColors)[];
  onClose: () => void;
  onSave: (name: string, colors: ThemeColors, assets: ThemeAssets) => Promise<void>;
  saveLoading: boolean;
}) {
  type AssetTab = 'colors' | 'background' | 'icons';
  const [name, setName] = useState(initialName);
  const [colors, setColors] = useState<ThemeColors>(initialColors);
  const [assetTab, setAssetTab] = useState<AssetTab>('colors');
  const [assets, setAssets] = useState<ThemeAssets>(mergeThemeAssets(initialAssets));
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activePicker, setActivePicker] = useState<'bg' | 'compass' | 'equip' | 'library' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accentWarm2, accentWarm3] = generateWarmColors(colors.accent);
  const iconRootPath = '/assets/images/ui';
  const bgRootPath = '/assets/images/ui/background';
  const iconTreeRoot = findTreeNode(imageTree, iconRootPath);
  const bgTreeRoot = findTreeNode(imageTree, bgRootPath);
  const iconTreeFiltered = filterTreeByPrefix(imageTree, iconRootPath);
  const bgTreeFiltered = filterTreeByPrefix(imageTree, bgRootPath);
  const iconTreeView = iconTreeRoot?.children?.length
    ? iconTreeRoot.children
    : iconTreeRoot
      ? [iconTreeRoot]
      : iconTreeFiltered;
  const bgTreeView = bgTreeRoot?.children?.length
    ? bgTreeRoot.children
    : bgTreeRoot
      ? [bgTreeRoot]
      : bgTreeFiltered;

  const setColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const ensureTreeLoaded = async () => {
    if (imageTree || treeLoading) return;
    setTreeLoading(true);
    try {
      const tree = await filesService.getImageTree('assets');
      setImageTree(tree);
    } catch {
      setError('Failed to load assets image tree.');
    } finally {
      setTreeLoading(false);
    }
  };

  const openPicker = async (picker: 'bg' | 'compass' | 'equip' | 'library') => {
    await ensureTreeLoaded();
    setActivePicker(picker);
  };

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAssetPath = (path: string) => {
    setError(null);
    if (activePicker === 'bg') {
      setAssets((prev) => ({ ...prev, background: path }));
    } else if (activePicker === 'compass' || activePicker === 'equip' || activePicker === 'library') {
      setAssets((prev) => ({ ...prev, icons: { ...prev.icons, [activePicker]: path } }));
    }
    setActivePicker(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Theme name cannot be empty.');

    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const k of colorKeys) {
      if (!hex.test(colors[k])) return setError(`Color "${k}" must be a hex code (e.g. #95245b).`);
    }

    try {
      await onSave(name.trim(), colors, assets);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <motion.div className="absolute inset-0 bg-black/50 cursor-pointer" aria-hidden variants={fadeInOverlay} initial="hidden" animate="visible" onClick={onClose} />
      <motion.div
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full h-[92vh] overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
        variants={scaleInModal}
        initial="hidden"
        animate="visible"
      >
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="z-10 border-b border-slate-200 px-6 py-4" style={{ backgroundImage: `linear-gradient(120deg, ${colors.accent}, ${accentWarm2}, ${accentWarm3})` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{initialName ? 'Edit theme' : 'Add new theme'}</h2>
                <p className="text-sm text-white/90 mt-1">Adjust the color palette and see a live preview while editing.</p>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-md border border-white/50 text-white hover:bg-white/15" title="Close popup" aria-label="Close popup">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-full">
              <div className="space-y-5 min-w-0">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Theme name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800" placeholder="e.g.: default, dark, light" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-1 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAssetTab('colors')}
                      className={`px-3 py-2 -mb-px text-sm border-b-2 transition-colors ${
                        assetTab === 'colors'
                          ? 'border-slate-900 text-slate-900 font-medium'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      Colors
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetTab('background')}
                      className={`px-3 py-2 -mb-px text-sm border-b-2 transition-colors ${
                        assetTab === 'background'
                          ? 'border-slate-900 text-slate-900 font-medium'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      Background
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetTab('icons')}
                      className={`px-3 py-2 -mb-px text-sm border-b-2 transition-colors ${
                        assetTab === 'icons'
                          ? 'border-slate-900 text-slate-900 font-medium'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      Icon
                    </button>
                  </div>

                  {assetTab === 'colors' && (
                    <div className="space-y-2">
                      {colorKeys.map((key) => (
                        <div key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5">
                          <input type="color" value={colors[key]} onChange={(e) => setColor(key, e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent appearance-none" title={`Pick color ${key}`} />
                          <input type="text" value={colors[key]} onChange={(e) => setColor(key, e.target.value)} className="flex-1 rounded-md px-3 py-1.5 text-sm font-mono bg-transparent" placeholder="#000000" title={`Enter hex code for ${key}`} />
                          <span className="text-slate-500 text-sm w-24 capitalize">{key}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {assetTab === 'background' && (
                    <div>
                      <div className="mb-1 text-xs text-slate-500">bg-image</div>
                      <ImagePickerSurface
                        pickerOpen={activePicker === 'bg'}
                        pickerTitle="Select background"
                        tree={bgTreeView}
                        treeLoading={treeLoading}
                        expanded={expanded}
                        onToggleExpanded={toggleExpanded}
                        onSelectPath={selectAssetPath}
                        onOpenPicker={() => void openPicker('bg')}
                        onClosePicker={() => setActivePicker(null)}
                        previewAlt="Theme background"
                        previewSrc={assets.background}
                        previewWrapperClassName="w-full max-w-[260px] aspect-[7/12] rounded-md border border-slate-200 bg-slate-50"
                        previewClassName="object-cover"
                        triggerTitle="Ctrl/Cmd + click to select background."
                        imageFallbackSrc="/assets/images/ui/background/default.webp"
                      />
                      <p className="mt-1 text-xs font-mono text-slate-600 break-all">{assets.background}</p>
                    </div>
                  )}

                  {assetTab === 'icons' && (
                    <div className="grid grid-cols-2 gap-4">
                      {(['compass', 'equip', 'library'] as const).map((key) => (
                        <div key={key} className="min-w-0">
                          <div className="mb-1 text-xs text-slate-500">icon {key}</div>
                          <ImagePickerSurface
                            pickerOpen={activePicker === key}
                            pickerTitle={`Select icon ${key}`}
                            tree={iconTreeView}
                            treeLoading={treeLoading}
                            expanded={expanded}
                            onToggleExpanded={toggleExpanded}
                            onSelectPath={selectAssetPath}
                            onOpenPicker={() => void openPicker(key)}
                            onClosePicker={() => setActivePicker(null)}
                            previewAlt={`Theme icon ${key}`}
                            previewSrc={assets.icons[key]}
                            previewWrapperClassName="w-full aspect-square rounded-md border border-slate-200 bg-slate-50"
                            previewClassName="object-contain p-3"
                            triggerTitle={`Ctrl/Cmd + click to select icon ${key}.`}
                            imageFallbackSrc="/assets/images/ui/library.webp"
                          />
                          <p className="mt-1 text-xs font-mono text-slate-600 break-all">{assets.icons[key]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
              </div>

              <div className="space-y-2 min-w-0 lg:sticky lg:top-0 self-start">
                <h3 className="text-sm font-medium text-slate-700">Live preview</h3>
                <ThemePreview colors={colors} assets={assets} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-3 bg-white">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveLoading}>
                {saveLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
