import type { Map as MapType, AdventureCard } from '../../services/gameDataService';
import { normalizeMapStatus } from './mapUtils';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface MapCardProps {
    map: MapType;
    onEdit: (map: MapType) => void;
}

/**
 * Displays a single map in the list view with type ratios and deck preview.
 */
export function MapCard({ map, onEdit }: MapCardProps) {
    const bgUrl = map.map_background?.trim();
    const hasBg = Boolean(bgUrl);
    const status = normalizeMapStatus(map.status);

    return (
        <Card
            className={cn(
                'border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden',
                hasBg && 'relative bg-transparent bg-cover bg-center bg-no-repeat'
            )}
            style={hasBg ? { backgroundImage: `url(${bgUrl})` } : undefined}
        >
            {hasBg && (
                <div
                    className="pointer-events-none absolute inset-0 z-0 bg-black/50"
                    aria-hidden
                />
            )}
            <div
                className={cn(
                    'p-1',
                    hasBg && 'relative z-10',
                    !hasBg && 'bg-gradient-to-r from-slate-50 to-blue-50/60'
                )}
            >
                <CardContent
                    className={cn('p-6', hasBg ? 'bg-transparent text-slate-100' : 'bg-card')}
                >
                    <CardHeader className="p-0 mb-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <CardTitle
                                    className={cn(
                                        'text-2xl flex items-center',
                                        hasBg ? 'text-white' : 'text-primary-700'
                                    )}
                                >
                                    <span className="mr-2 text-3xl">🗺️</span>
                                    {map.name}
                                </CardTitle>
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <CardDescription
                                        className={cn('font-mono text-sm', hasBg && 'text-slate-300')}
                                    >
                                        {map.nameId}
                                    </CardDescription>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            status === 'enabled'
                                                ? hasBg
                                                    ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-100'
                                                    : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                                : hasBg
                                                  ? 'border-red-300/50 bg-red-500/20 text-red-100'
                                                  : 'border-red-200 bg-red-100 text-red-800'
                                        )}
                                    >
                                        {status}
                                    </Badge>
                                </div>
                                {map.description && (
                                    <CardDescription
                                        className={cn('mt-2 text-base', hasBg && 'text-slate-200')}
                                    >
                                        {map.description}
                                    </CardDescription>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        hasBg &&
                                            'border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-[#2463eb80] hover:text-white'
                                    )}
                                    onClick={() => onEdit(map)}
                                >
                                    Sửa
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Type ratios */}
                    {map.typeRatios && Object.keys(map.typeRatios).length > 0 && (
                        <div className="mb-4">
                            <span
                                className={cn(
                                    'text-sm font-semibold',
                                    hasBg ? 'text-white' : 'text-foreground'
                                )}
                            >
                                Type ratios:{' '}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(map.typeRatios).map(
                                    ([k, v]) =>
                                        v != null && (
                                            <Badge
                                                key={k}
                                                variant="outline"
                                                className={cn(
                                                    hasBg
                                                        ? 'border-white/30 bg-white/10 text-slate-100'
                                                        : 'border-primary-200 bg-white'
                                                )}
                                            >
                                                {k}: {v}
                                            </Badge>
                                        )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deck preview */}
                    <div>
                        <div className="flex items-center mb-3">
                            <span
                                className={cn(
                                    'text-sm font-semibold mr-2',
                                    hasBg ? 'text-white' : 'text-foreground'
                                )}
                            >
                                📚 Deck ({map.deck?.length ?? 0} thẻ):
                            </span>
                        </div>
                        <div
                            className={cn(
                                'flex flex-wrap gap-2 rounded-lg border p-4 backdrop-blur-md',
                                hasBg
                                    ? 'border-white/25 bg-white/10'
                                    : 'border-slate-200 bg-gradient-to-br from-slate-50/90 to-blue-50/50'
                            )}
                        >
                            {(map.deck ?? []).map((card: AdventureCard) => (
                                <Badge
                                    key={card._id}
                                    variant="outline"
                                    className={cn(
                                        hasBg
                                            ? 'border-white/30 bg-white/10 text-slate-100 hover:bg-white/15'
                                            : 'border-primary-200 bg-white text-primary-700 hover:bg-primary-50'
                                    )}
                                >
                                    {card.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
