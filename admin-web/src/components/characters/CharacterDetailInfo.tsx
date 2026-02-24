import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ElementIcon } from '../ElementIcon';
import type { EditingField } from './characterDetailUtils';

type I18nField = 'name' | 'description';

interface CharacterDetailInfoProps {
  effectiveElement: string;
  displayName: string;
  displayHp: number;
  displayLevel: number;
  displayDescription: string;
  editingField: EditingField;
  onOpenI18n: (field: I18nField) => void;
  onStartEdit: (field: EditingField, currentValue?: string | number) => void;
}

export function CharacterDetailInfo({
  effectiveElement,
  displayName,
  displayHp,
  displayLevel,
  displayDescription,
  editingField,
  onOpenI18n,
  onStartEdit,
}: CharacterDetailInfoProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Chi tiết
      </h2>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <button
            type="button"
            onClick={() => onOpenI18n('name')}
            className="flex items-start gap-2 group/name w-full text-left rounded-md -m-1 p-1 hover:bg-gray-50 transition-colors cursor-pointer"
            aria-label="Edit name i18n"
          >
            <CardTitle className="text-2xl text-gray-700 flex-1">{displayName}</CardTitle>
            <span className="text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 group-hover/name:opacity-60 transition-opacity">
              <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenI18n('description')}
            className="flex items-start gap-2 mt-2 group/desc w-full text-left rounded-md -m-1 p-1 hover:bg-gray-50 transition-colors cursor-pointer"
            aria-label="Edit description i18n"
          >
            <CardDescription className="text-base flex-1">{displayDescription}</CardDescription>
            <span className="text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 group-hover/desc:opacity-60 transition-opacity">
              <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
            </span>
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => onStartEdit(editingField === 'hp' ? null : 'hp')}
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg w-full text-left hover:bg-gray-100 transition-colors group cursor-pointer"
          >
            <span className="font-medium text-muted-foreground flex items-center gap-2">
              ❤️ HP
              <FontAwesomeIcon
                icon={faSquarePen}
                className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity"
              />
            </span>
            <span className="font-bold text-gray-600">{displayHp}</span>
          </button>
          <button
            type="button"
            onClick={() => onStartEdit(editingField === 'element' ? null : 'element')}
            className="flex justify-between items-center p-3 bg-slate-100 rounded-lg w-full text-left hover:bg-slate-200 transition-colors group cursor-pointer"
          >
            <span className="font-medium text-muted-foreground flex items-center gap-2">
              ⚡ Element
              <FontAwesomeIcon
                icon={faSquarePen}
                className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity"
              />
            </span>
            <span className="flex items-center gap-2">
              <ElementIcon
                element={effectiveElement}
                size="sm"
                className="border-2 border-gray-400 shrink-0"
              />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onStartEdit(editingField === 'level' ? null : 'level')}
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg w-full text-left hover:bg-gray-100 transition-colors group cursor-pointer"
          >
            <span className="font-medium text-muted-foreground flex items-center gap-2">
              ⭐ Level
              <FontAwesomeIcon
                icon={faSquarePen}
                className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity"
              />
            </span>
            <span className="font-bold text-gray-600">{displayLevel}</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
