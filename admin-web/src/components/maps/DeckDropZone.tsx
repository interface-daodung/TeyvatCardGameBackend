import { useState } from 'react';
import type { AdventureCard } from '../../services/gameDataService';
import { getCardImageUrl } from './mapUtils';

interface DeckDropZoneProps {
    /** Currently selected card IDs (order matters) */
    cardIds: string[];
    /** All available cards for ID → card lookup */
    allCards: AdventureCard[];
    /** Called when a card is dropped into the zone */
    onAdd: (cardId: string) => void;
    /** Called when clicking remove button on a card at given index */
    onRemove: (index: number) => void;
    /** Override default image URL resolver */
    getImageUrl?: (card: AdventureCard) => string;
    /** Placeholder when deck is empty */
    emptyMessage?: string;
}

/**
 * A drop zone that accepts dragged cards and displays them as thumbnails.
 * Reusable: any feature needing a "drop items here" target can use this.
 */
export function DeckDropZone({
    cardIds,
    allCards,
    onAdd,
    onRemove,
    getImageUrl = getCardImageUrl,
    emptyMessage = 'Kéo thẻ từ danh sách bên phải vào đây',
}: DeckDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={`min-h-[280px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-2 content-start transition-colors ${isDragOver
                    ? 'border-primary-400 ring-2 ring-primary-400 bg-primary-100/50'
                    : 'border-primary-200 bg-primary-50/50'
                }`}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const id = e.dataTransfer.getData('cardId');
                if (id) onAdd(id);
            }}
        >
            {cardIds.length === 0 && (
                <span className="text-sm text-muted-foreground self-center">{emptyMessage}</span>
            )}
            {cardIds.map((cardId, index) => {
                const card = allCards.find((c) => c._id === cardId);
                if (!card) return null;
                return (
                    <div
                        key={`${cardId}-${index}`}
                        className="relative group w-14 shrink-0 aspect-[420/720] rounded overflow-hidden border border-border bg-card shadow-sm"
                    >
                        <img
                            src={getImageUrl(card)}
                            alt={card.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-600"
                            aria-label="Bỏ thẻ khỏi deck"
                        >
                            −
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
