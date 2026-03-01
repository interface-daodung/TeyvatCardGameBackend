import type { Map as MapType, AdventureCard } from '../../services/gameDataService';
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
    return (
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-50 to-red-50 p-1">
                <CardContent className="bg-card p-6">
                    <CardHeader className="p-0 mb-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <CardTitle className="text-2xl text-primary-700 flex items-center">
                                    <span className="mr-2 text-3xl">🗺️</span>
                                    {map.name}
                                </CardTitle>
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <CardDescription className="font-mono text-sm">{map.nameId}</CardDescription>
                                    <Badge
                                        variant="outline"
                                        className={
                                            map.status === 'enabled'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : map.status === 'hidden'
                                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                                    : 'bg-red-100 text-red-800 border-red-200'
                                        }
                                    >
                                        {map.status}
                                    </Badge>
                                </div>
                                {map.description && (
                                    <CardDescription className="mt-2 text-base">{map.description}</CardDescription>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => onEdit(map)}>
                                    Sửa
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Type ratios */}
                    {map.typeRatios && Object.keys(map.typeRatios).length > 0 && (
                        <div className="mb-4">
                            <span className="text-sm font-semibold text-foreground">Type ratios: </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(map.typeRatios).map(
                                    ([k, v]) =>
                                        v != null && (
                                            <Badge key={k} variant="outline" className="bg-white border-primary-200">
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
                            <span className="text-sm font-semibold text-foreground mr-2">
                                📚 Deck ({map.deck?.length ?? 0} thẻ):
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-primary-50 to-red-50 rounded-lg border border-primary-100">
                            {(map.deck ?? []).map((card: AdventureCard) => (
                                <Badge
                                    key={card._id}
                                    variant="outline"
                                    className="bg-white border-primary-200 text-primary-700 hover:bg-primary-50"
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
