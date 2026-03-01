import { useEffect, useState } from 'react';
import {
  gameDataService,
  type Map as MapType,
  type AdventureCard,
} from '../services/gameDataService';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { MapCard } from '../components/maps/MapCard';
import { MapFormModal } from '../components/maps/MapFormModal';

export default function Maps() {
  const [maps, setMaps] = useState<MapType[]>([]);
  const [adventureCards, setAdventureCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapType | null>(null);

  const fetchMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameDataService.getMaps();
      setMaps(data);
    } catch (err) {
      console.error('Failed to fetch maps:', err);
      setError('Không tải được danh sách maps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await gameDataService.getAdventureCards();
        setAdventureCards(data);
      } catch (err) {
        console.error('Failed to fetch adventure cards:', err);
      }
    };
    fetchCards();
  }, []);

  const openCreateModal = () => {
    setEditingMap(null);
    setModalOpen(true);
  };

  const openEditModal = (map: MapType) => {
    setEditingMap(map);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingMap(null);
  };

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
      <div className="flex items-center justify-between">
        <PageHeader title="Maps" description="Quản lý map dungeon và deck thẻ" />
        <Button onClick={openCreateModal} className="bg-primary-600 hover:bg-primary-700">
          Thêm map
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {maps.map((map) => (
          <MapCard key={map._id} map={map} onEdit={openEditModal} />
        ))}
      </div>

      <MapFormModal
        open={modalOpen}
        editingMap={editingMap}
        adventureCards={adventureCards}
        onClose={closeModal}
        onSaved={fetchMaps}
      />
    </div>
  );
}
