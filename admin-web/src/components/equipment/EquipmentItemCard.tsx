import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  getItemImageUrl,
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
}

export function EquipmentItemCard({
  item,
  editLang,
  getItemDisplayName,
  getItemDisplayDescription,
  onClick,
}: EquipmentItemCardProps) {
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
            <img
              src={getItemImageUrl(item.image)}
              alt={getItemDisplayName(item, editLang)}
              className="absolute inset-0 w-full h-full object-cover z-10 rounded-lg group-hover:scale-150 group-hover:-translate-y-3 transition-transform duration-300 ease-out"
            />
            <div className="absolute top-0.5 right-0.5 z-20">
              <Badge
                variant="secondary"
                className="bg-emerald-600/90 text-white border-0 text-[9px] px-1 py-0"
              >
                Lv.{item.level}/{item.maxLevel}
              </Badge>
            </div>
          </div>

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
        </CardContent>
      </div>
    </Card>
  );
}
