import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, User } from '../services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [xu, setXu] = useState(0);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await userService.getUserById(id);
        setUser(data);
        setXu(data.xu);
        setIsBanned(data.isBanned);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleBanToggle = async () => {
    if (!id) return;
    try {
      await userService.banUser(id, !isBanned);
      setIsBanned(!isBanned);
    } catch (error) {
      console.error('Failed to update ban status:', error);
    }
  };

  const handleUpdateXu = async () => {
    if (!id) return;
    try {
      await userService.updateUserXu(id, xu);
      alert('Xu updated successfully');
    } catch (error) {
      console.error('Failed to update Xu:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">User not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Button
        onClick={() => navigate('/users')}
        variant="ghost"
        className="text-primary-700 hover:text-primary-800"
      >
        ← Back to Users
      </Button>

      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-red-600 bg-clip-text text-transparent mb-2">
          User Details
        </h1>
        <p className="text-muted-foreground">Manage user account and permissions</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-400 to-red-400 flex items-center justify-center text-white font-bold text-2xl shadow-md">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-2xl">{user.email}</CardTitle>
              <CardDescription className="text-base mt-1 flex items-center gap-2">
                {user.role} •
                {user.role === 'user' && (
                  <a
                    href={`/user/${user._id}/Payments`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                  >
                    🔗 Link nạp tiền
                  </a>
                )}
                {isBanned ? (
                  <Badge variant="destructive">Banned</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">💰 Currency (Xu)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={xu}
                  onChange={(e) => setXu(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Button
                  onClick={handleUpdateXu}
                  className="bg-gradient-to-r from-primary-600 to-red-600 hover:from-primary-700 hover:to-red-700"
                >
                  Update
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Account Status</label>
              <Button
                onClick={handleBanToggle}
                variant={isBanned ? 'default' : 'destructive'}
                className={isBanned ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' : ''}
              >
                {isBanned ? 'Unban User' : 'Ban User'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary-700">⚔️ Owned Characters</CardTitle>
            <CardDescription>{user.ownedCharacters.length} characters</CardDescription>
          </CardHeader>
          <CardContent>
            {user.ownedCharacters.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No characters owned</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {user.ownedCharacters.map((char: any) => (
                  <div key={char._id} className="p-3 border border-primary-100 rounded-lg bg-primary-50/30 hover:bg-primary-50 transition-colors">
                    <div className="font-semibold text-foreground">{char.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{char.description}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-red-700">🚫 Banned Cards</CardTitle>
            <CardDescription>
              {user.bannedCards.characters.length + user.bannedCards.equipment.length} cards banned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Banned Characters ({user.bannedCards.characters.length})</h3>
              {user.bannedCards.characters.length === 0 ? (
                <p className="text-muted-foreground text-sm">No banned characters</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.bannedCards.characters.map((char: any) => (
                    <Badge key={char._id} variant="destructive">
                      {char.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Banned Equipment ({user.bannedCards.equipment.length})</h3>
              {user.bannedCards.equipment.length === 0 ? (
                <p className="text-muted-foreground text-sm">No banned equipment</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.bannedCards.equipment.map((eq: any) => (
                    <Badge key={eq._id} variant="destructive">
                      {eq.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
