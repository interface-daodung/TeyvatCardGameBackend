import { useEffect, useState } from 'react';
import { gameDataService, AdventureCard } from '../services/gameDataService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

export default function AdventureCards() {
  const [cards, setCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const data = await gameDataService.getAdventureCards();
        setCards(data);
      } catch (error) {
        console.error('Failed to fetch adventure cards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      situation: '🎲',
      food: '🍎',
      monster: '👹',
      temporary_weapon: '⚔️',
    };
    return icons[type] || '🎴';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-red-600 bg-clip-text text-transparent mb-2">
          Adventure Cards
        </h1>
        <p className="text-muted-foreground">Manage adventure cards for maps</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-primary-100 to-red-100 p-1">
              <CardContent className="bg-card p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl text-primary-700 flex items-center">
                    <span className="mr-2 text-2xl">{getTypeIcon(card.type)}</span>
                    {card.name}
                  </CardTitle>
                  <CardDescription className="mt-2">{card.description}</CardDescription>
                </CardHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                    <Badge variant="outline" className="border-primary-200 text-primary-700">
                      {card.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">📊 Appearance Rate</span>
                    <span className="text-sm font-bold text-red-600">{card.appearanceRate}%</span>
                  </div>
                  {card.stats && (
                    <>
                      {card.stats.attack && (
                        <div className="flex justify-between items-center p-2 bg-primary-50 rounded-md">
                          <span className="text-sm font-medium text-muted-foreground">⚔️ Attack</span>
                          <span className="text-sm font-bold text-primary-600">{card.stats.attack}</span>
                        </div>
                      )}
                      {card.stats.defense && (
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                          <span className="text-sm font-medium text-muted-foreground">🛡️ Defense</span>
                          <span className="text-sm font-bold text-red-600">{card.stats.defense}</span>
                        </div>
                      )}
                      {card.stats.health && (
                        <div className="flex justify-between items-center p-2 bg-primary-50 rounded-md">
                          <span className="text-sm font-medium text-muted-foreground">❤️ Health</span>
                          <span className="text-sm font-bold text-primary-600">{card.stats.health}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Badge
                      variant={card.status === 'enabled' ? 'default' : card.status === 'disabled' ? 'destructive' : 'secondary'}
                      className={card.status === 'enabled' ? 'bg-green-100 text-green-800 border-green-200' : card.status === 'hidden' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                    >
                      {card.status}
                    </Badge>
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
