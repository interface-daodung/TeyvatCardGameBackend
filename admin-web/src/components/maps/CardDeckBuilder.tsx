import type { AdventureCard } from '../../services/gameDataService';
import { getCardImageUrl } from './mapUtils';
import { DeckDropZone } from './DeckDropZone';
import { DraggableCardThumbnail } from './DraggableCardThumbnail';

interface CardDeckBuilderProps {
    /** Currently selected card IDs (order matters) */
    cardIds: string[];
    /** All cards available for selection */
    availableCards: AdventureCard[];
    /** Called when the deck changes (add / remove) */
    onDeckChange: (newCardIds: string[]) => void;
    /** Override default image URL resolver */
    getImageUrl?: (card: AdventureCard) => string;
    /** Label for the deck section */
    deckLabel?: string;
    /** Label for the source list section */
    sourceLabel?: string;
    /** Filter predicate for available cards (default: exclude empty type) */
    filterCard?: (card: AdventureCard) => boolean;
}

/**
 * Two-column drag-and-drop card deck builder.
 *
 * **Reusable**: use this wherever you need a "pick cards from a list" UI.
 * Left column = drop zone (selected deck), right column = draggable source list.
 */
export function CardDeckBuilder({
    cardIds,
    availableCards = [],
    onDeckChange,
    getImageUrl = getCardImageUrl,
    deckLabel = 'Deck',
    sourceLabel = 'Thẻ có sẵn (kéo vào deck)',
    filterCard = (c) => c.type !== 'empty' && c.nameId !== 'empty',
}: CardDeckBuilderProps) {
    const handleAdd = (cardId: string) => {
        if (!cardIds.includes(cardId)) {
            onDeckChange([...cardIds, cardId]);
        }
    };

    const handleRemove = (index: number) => {
        onDeckChange(cardIds.filter((_, i) => i !== index));
    };

    const filteredCards = availableCards.filter(filterCard);

    return (
        <div className="flex gap-6 flex-col sm:flex-row pt-2 border-t border-border">
            {/* Deck drop zone */}
            <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-2">{deckLabel}</label>
                <DeckDropZone
                    cardIds={cardIds}
                    allCards={availableCards}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    getImageUrl={getImageUrl}
                />
                <p className="text-xs text-muted-foreground mt-1">{cardIds.length} thẻ trong deck</p>
            </div>

            {/* Source card list */}
            <div className="w-full sm:w-72 shrink-0">
                <label className="block text-sm font-medium mb-2">{sourceLabel}</label>
                <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
                    <div className="grid grid-cols-3 gap-2">
                        {filteredCards.map((c) => (
                            <DraggableCardThumbnail key={c._id} card={c} getImageUrl={getImageUrl} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
