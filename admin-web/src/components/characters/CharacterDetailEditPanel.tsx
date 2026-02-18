import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ELEMENT_OPTIONS } from './characterDetailUtils';
import type { EditingField } from './characterDetailUtils';

interface CharacterDetailEditPanelProps {
  editingField: EditingField;
  editedHp: string;
  onEditedHpChange: (value: string) => void;
  effectiveElement: string;
  displayLevel: number;
  onDisplayLevelChange: (fn: (l: number) => number) => void;
  levelPrices: { level: number; price: number }[];
  editingPriceForLevel: number | null;
  editedPriceValue: string;
  onEditedPriceValueChange: (value: string) => void;
  saveLoading: boolean;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onSavePriceEdit: (level: number) => void;
  onStartPriceEdit: (level: number, price: number) => void;
  onSetDisplayElementAndPersist: (el: string) => void;
}

export function CharacterDetailEditPanel({
  editingField,
  editedHp,
  onEditedHpChange,
  effectiveElement,
  displayLevel,
  onDisplayLevelChange,
  levelPrices,
  editingPriceForLevel,
  editedPriceValue,
  onEditedPriceValueChange,
  saveLoading,
  onSaveEdit,
  onCancelEdit,
  onSavePriceEdit,
  onStartPriceEdit,
  onSetDisplayElementAndPersist,
}: CharacterDetailEditPanelProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Edit
      </h2>
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          {!editingField && (
            <p className="text-sm text-muted-foreground">
              Chọn trường cần chỉnh sửa ở phần Chi tiết
            </p>
          )}
          {editingField === 'hp' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">HP</label>
              <input
                type="number"
                value={editedHp}
                onChange={(e) => onEditedHpChange(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={onSaveEdit}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </Button>
                <Button onClick={onCancelEdit} variant="outline" size="sm">
                  Hủy
                </Button>
              </div>
            </div>
          )}
          {editingField === 'element' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Element</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSetDisplayElementAndPersist('none')}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                    effectiveElement === 'none'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="w-6 h-6 shrink-0 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-gray-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium">none</span>
                </button>
                {ELEMENT_OPTIONS.map((el) => (
                  <button
                    key={el}
                    type="button"
                    onClick={() => onSetDisplayElementAndPersist(el)}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                      effectiveElement === el
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <img
                      src={`/assets/images/element/${el}.webp`}
                      alt={el}
                      className="w-6 h-6 shrink-0"
                    />
                    <span className="text-sm font-medium capitalize">{el}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {editingField === 'level' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Bảng giá upgrade theo level
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">level max</span>
                    <span className="text-xs font-semibold min-w-[1.25rem] text-center">
                      {displayLevel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDisplayLevelChange((l) => Math.max(1, l - 1))}
                      className="w-5 h-5 rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold leading-none"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisplayLevelChange((l) => l + 1)}
                      className="w-5 h-5 rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {levelPrices.map(({ level, price }) => (
                    <div
                      key={level}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm group hover:bg-gray-100"
                    >
                      <span className="font-medium">Level {level}</span>
                      {level === displayLevel ? (
                        <span className="text-gray-600">MAX</span>
                      ) : editingPriceForLevel === level ? (
                        <input
                          type="number"
                          value={editedPriceValue}
                          onChange={(e) => onEditedPriceValueChange(e.target.value)}
                          onBlur={() => onSavePriceEdit(level)}
                          onKeyDown={(e) => e.key === 'Enter' && onSavePriceEdit(level)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-2 py-0.5 rounded border border-gray-300 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartPriceEdit(level, price)}
                          className="flex items-center gap-1.5 hover:bg-gray-200 rounded px-1 -mr-1"
                        >
                          <span className="text-gray-600">price {price}</span>
                          <FontAwesomeIcon
                            icon={faSquarePen}
                            className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onSaveEdit}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </Button>
                <Button onClick={onCancelEdit} variant="outline" size="sm">
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
