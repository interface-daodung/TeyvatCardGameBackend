import { useEffect, useState } from 'react';
import { gameDataService, type Map as MapType } from '../services/gameDataService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

export default function Maps() {
  const [maps, setMaps] = useState<MapType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        setLoading(true);
        const data = await gameDataService.getMaps();
        setMaps(data);
      } catch (error) {
        console.error('Failed to fetch maps:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaps();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-red-600 bg-clip-text text-transparent mb-2">
          Maps
        </h1>
        <p className="text-muted-foreground">Manage dungeon maps and their card decks</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {maps.map((map) => (
          <Card key={map._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-50 to-red-50 p-1">
              <CardContent className="bg-card p-6">
                <CardHeader className="p-0 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-primary-700 flex items-center">
                        <span className="mr-2 text-3xl">🗺️</span>
                        {map.name}
                      </CardTitle>
                      <CardDescription className="mt-2 text-base">{map.description}</CardDescription>
                    </div>
                    <Badge
                      variant={map.status === 'enabled' ? 'default' : 'destructive'}
                      className={map.status === 'enabled' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                    >
                      {map.status}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="mt-4">
                  <div className="flex items-center mb-3">
                    <span className="text-sm font-semibold text-foreground mr-2">📚 Deck ({map.deck.length} cards):</span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-primary-50 to-red-50 rounded-lg border border-primary-100">
                    {map.deck.map((card: any) => (
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
        ))}
      </div>
    </div>
  );
}
