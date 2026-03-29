import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { enabledDisabledStatusPillClass } from '../share';
import {
  getItemImageSrcFromDb,
  getDisplayPower,
  getDisplayCooldown,
  renderColoredDescription,
  type GameItem,
} from './equipmentUtils';
import type { EditLang } from '../LangDropdown';

interface EquipmentItemCardProps {
  item: GameItem;
  editLang: EditLang;
  getItemDisplayName: (item: GameItem, lang: EditLang) => string;
  getItemDisplayDescription: (item: GameItem, lang: EditLang) => string;
  onClick: () => void;
  /** Chỉ khối ảnh (strip khi mở drawer): ẩn badge, tiêu đề, mô tả, stats */
  imageOnly?: boolean;
}

export function EquipmentItemCard({
  item,
  editLang,
  getItemDisplayName,
  getItemDisplayDescription,
  onClick,
  imageOnly = false,
}: EquipmentItemCardProps) {
  const imageSrc = getItemImageSrcFromDb(item.image);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative border-0 shadow-sm hover:shadow-md hover:z-10 transition-all duration-300 overflow-visible group cursor-pointer"
    >
      <div className="bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-50 p-0.5 rounded-lg overflow-visible">
        <CardContent className="bg-card p-0 overflow-visible">
          <div className="relative aspect-square bg-gradient-to-b from-emerald-200/50 to-teal-100/50 overflow-visible">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={getItemDisplayName(item, editLang)}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="absolute inset-0 z-10 h-full w-full rounded-lg object-cover transition-transform duration-300 ease-out group-hover:scale-150 group-hover:-translate-y-3 select-none [-webkit-user-drag:none]"
              />
            ) : (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-lg bg-muted text-muted-foreground">
                <FontAwesomeIcon icon={faImage} className="w-10 h-10 opacity-35" aria-hidden />
                {!imageOnly && (
                  <span className="text-[9px] px-1 text-center">Chưa có ảnh</span>
                )}
              </div>
            )}
            {!imageOnly && (
              <div className="absolute top-0.5 right-0.5 z-20">
                <span
                  role="status"
                  aria-label={`Trạng thái: ${item.status}`}
                  className={cn(
                    'inline-flex items-center rounded-full border-0 text-[9px] px-1 py-0 font-semibold',
                    enabledDisabledStatusPillClass(item.status)
                  )}
                >
                  {item.status}
                </span>
              </div>
            )}
          </div>

          {!imageOnly && (
            <>
              <CardHeader className="p-1.5 pb-0">
                <CardTitle className="text-[11px] font-semibold text-emerald-800 leading-tight line-clamp-1">
                  {getItemDisplayName(item, editLang)}
                </CardTitle>
                <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
                  {renderColoredDescription(
                    getItemDisplayDescription(item, editLang),
                    item.basePower,
                    item.baseCooldown
                  )}
                </p>
              </CardHeader>

              <div className="px-1.5 pb-1.5 space-y-0.5">
                <div className="flex items-center justify-between gap-0.5 text-[9px]">
                  <span className="text-emerald-600 font-medium">
                    ⚡{getDisplayPower(item).toFixed(1)}
                  </span>
                  <span className="text-teal-600 font-medium">
                    ⏱{getDisplayCooldown(item).toFixed(1)}
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="text-[8px] text-muted-foreground font-mono truncate block">
                    {item.nameId}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
