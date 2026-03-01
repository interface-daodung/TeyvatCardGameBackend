import type { AdventureCard } from '../../services/gameDataService';
import { getCardImageUrl } from './mapUtils';

interface DraggableCardThumbnailProps {
    card: AdventureCard;
    /** Override default image URL resolver */
    getImageUrl?: (card: AdventureCard) => string;
}

/**
 * A draggable card thumbnail for the source panel.
 * Reusable: any drag-and-drop card picker can use this.
 */
export function DraggableCardThumbnail({
    card,
    getImageUrl = getCardImageUrl,
}: DraggableCardThumbnailProps) {
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('cardId', card._id);
                e.dataTransfer.effectAllowed = 'copy';
            }}
            className="cursor-grab active:cursor-grabbing rounded overflow-hidden border border-border bg-card hover:border-primary-400 hover:shadow transition-all"
        >
            <div className="aspect-[420/720] relative">
                <img
                    src={getImageUrl(card)}
                    alt={card.name}
                    className="w-full h-full object-cover pointer-events-none"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                    }}
                />
            </div>
            <p className="text-[10px] font-medium truncate px-1 py-0.5 bg-card" title={card.name}>
                {card.name}
            </p>
        </div>
    );
}
