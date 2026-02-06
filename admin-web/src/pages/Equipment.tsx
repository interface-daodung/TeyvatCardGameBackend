import { useEffect, useState } from 'react';
import { gameDataService, type Equipment as EquipmentType } from '../services/gameDataService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

export default function Equipment() {
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const data = await gameDataService.getEquipment();
        setEquipment(data);
      } catch (error) {
        console.error('Failed to fetch equipment:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-red-600 bg-clip-text text-transparent mb-2">
          Equipment
        </h1>
        <p className="text-muted-foreground">Manage game equipment and items</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {equipment.map((item) => (
          <Card key={item._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-red-100 to-primary-100 p-1">
              <CardContent className="bg-card p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl text-red-700">{item.name}</CardTitle>
                  <CardDescription className="mt-2">{item.description}</CardDescription>
                </CardHeader>
                <div className="space-y-3">
                  <div className="p-2 bg-red-50 rounded-md">
                    <span className="text-xs font-medium text-muted-foreground">Slot: </span>
                    <Badge variant="outline" className="ml-2 border-red-200 text-red-700">
                      {item.slot}
                    </Badge>
                  </div>
                  {item.stats.attack && (
                    <div className="flex justify-between items-center p-2 bg-primary-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">⚔️ Attack</span>
                      <span className="text-sm font-bold text-primary-600">{item.stats.attack}</span>
                    </div>
                  )}
                  {item.stats.defense && (
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">🛡️ Defense</span>
                      <span className="text-sm font-bold text-red-600">{item.stats.defense}</span>
                    </div>
                  )}
                  {item.stats.health && (
                    <div className="flex justify-between items-center p-2 bg-primary-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">❤️ Health</span>
                      <span className="text-sm font-bold text-primary-600">{item.stats.health}</span>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Badge
                      variant={item.status === 'enabled' ? 'default' : item.status === 'disabled' ? 'destructive' : 'secondary'}
                      className={item.status === 'enabled' ? 'bg-green-100 text-green-800 border-green-200' : item.status === 'hidden' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                    >
                      {item.status}
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
