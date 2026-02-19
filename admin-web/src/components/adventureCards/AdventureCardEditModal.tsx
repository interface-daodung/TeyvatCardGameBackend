import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { AdventureCardImagePicker } from './AdventureCardImagePicker';
import { AdventureCardEditForm } from './AdventureCardEditForm';
import { I18nEditorPanel } from '../i18n/I18nEditorPanel';
import type { AdventureCard } from '../../services/gameDataService';
import type { FileTreeItem } from '../../services/filesService';
import type { EditLang } from '../LangDropdown';

interface AdventureCardEditModalProps {
  editCard: AdventureCard;
  form: Partial<AdventureCard>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AdventureCard>>>;
  error: string | null;
  saveLoading: boolean;
  editLang: EditLang;
  nameDisplay: string;
  descriptionDisplay: string;
  i18nField: 'name' | 'description' | null;
  getFormI18n: (lang: EditLang) => string;
  setFormI18n: (lang: EditLang, val: string) => void;
  translateLoading: boolean;
  i18nError: string | null;
  imageTreeOpen: boolean;
  imageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onClose: () => void;
  onSave: () => void;
  onOpenI18n: (field: 'name' | 'description') => void;
  onI18nTranslate: () => Promise<void>;
  onI18nSave: () => void | Promise<void>;
  onI18nClose: () => void;
  onToggleTree: () => void;
  onToggleTreeExpanded: (path: string) => void;
  onSelectImage: (path: string) => void;
  onCloseTree: () => void;
}

export function AdventureCardEditModal({
  editCard,
  form,
  setForm,
  error,
  saveLoading,
  editLang,
  nameDisplay,
  descriptionDisplay,
  i18nField,
  getFormI18n,
  setFormI18n,
  translateLoading,
  i18nError,
  imageTreeOpen,
  imageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onClose,
  onSave,
  onOpenI18n,
  onI18nTranslate,
  onI18nSave,
  onI18nClose,
  onToggleTree,
  onToggleTreeExpanded,
  onSelectImage,
  onCloseTree,
}: AdventureCardEditModalProps) {
  const modal = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen min-w-screen w-full h-full z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex items-stretch gap-4">
        <div className="w-full max-w-3xl rounded-xl bg-card shadow-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-red-600 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Edit Adventure Card</h2>
              <p className="text-sm text-primary-100 mt-1">
                {editCard.name} ({editCard.nameId})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center text-white text-3xl leading-none hover:bg-white/10 rounded-full border border-white/30"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-4 rounded bg-destructive/10 text-destructive text-sm px-3 py-2">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[1.1fr,1.2fr] gap-6 items-start">
              <div className="space-y-3">
                <AdventureCardImagePicker
                  card={editCard}
                  formImage={form.image}
                  isTreeOpen={imageTreeOpen}
                  onToggleTree={onToggleTree}
                  imageTree={imageTree}
                  imageTreeLoading={imageTreeLoading}
                  imageTreeExpanded={imageTreeExpanded}
                  onToggleExpanded={onToggleTreeExpanded}
                  onSelectImage={onSelectImage}
                  onCloseTree={onCloseTree}
                />
              </div>
              <AdventureCardEditForm
                card={editCard}
                form={form}
                setForm={setForm}
                editLang={editLang}
                nameDisplay={nameDisplay}
                descriptionDisplay={descriptionDisplay}
                onOpenI18n={onOpenI18n}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button type="button" disabled={saveLoading} onClick={onSave}>
              {saveLoading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </div>

        {i18nField && (
          <I18nEditorPanel
            title={i18nField === 'name' ? 'Sửa Name (i18n)' : 'Sửa Description (i18n)'}
            fieldType={i18nField}
            editLang={editLang}
            getValue={getFormI18n}
            onChange={setFormI18n}
            onTranslate={onI18nTranslate}
            onSave={onI18nSave}
            onClose={onI18nClose}
            translateLoading={translateLoading}
            error={i18nError}
          />
        )}
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
