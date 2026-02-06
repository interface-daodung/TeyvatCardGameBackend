import { useEffect, useState } from 'react';
import { gameDataService, Character } from '../services/gameDataService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

export default function Characters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setLoading(true);
        const data = await gameDataService.getCharacters();
        setCharacters(data);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacters();
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
                <Skeleton className="h-4 w-3/4" />
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
          Characters
        </h1>
        <p className="text-muted-foreground">Manage game characters and their stats</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <Card key={character._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-primary-100 to-red-100 p-1">
              <CardContent className="bg-card p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl text-primary-700">{character.name}</CardTitle>
                  <CardDescription className="mt-2">{character.description}</CardDescription>
                </CardHeader>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-primary-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">⚔️ Attack</span>
                    <span className="text-sm font-bold text-primary-600">{character.stats.attack}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">🛡️ Defense</span>
                    <span className="text-sm font-bold text-red-600">{character.stats.defense}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-primary-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">❤️ Health</span>
                    <span className="text-sm font-bold text-primary-600">{character.stats.health}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">⭐ Max Level</span>
                    <span className="text-sm font-bold text-red-600">{character.maxLevel}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Badge
                      variant={
                        character.status === 'enabled'
                          ? 'default'
                          : character.status === 'disabled'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className={
                        character.status === 'enabled'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : character.status === 'hidden'
                          ? 'bg-gray-100 text-gray-800 border-gray-200'
                          : character.status === 'unreleased'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : ''
                      }
                    >
                      {character.status}
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
