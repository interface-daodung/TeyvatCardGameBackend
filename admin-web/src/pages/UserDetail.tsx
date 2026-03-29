import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { userService, User } from '../services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { fadeSlideCard, fadeInOverlay, zoomInPopup } from '../components/animations/motionPresets';
import { CharacterCard, type CharacterCardData } from '../components/characters/CharacterCard';
import { gameDataService, type Item } from '../services/gameDataService';
import { getDefaultItemImageUrl } from '../components/equipment/equipmentUtils';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [xu, setXu] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [xuConfirmOpen, setXuConfirmOpen] = useState(false);
  const [updatingXu, setUpdatingXu] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [payosIframeOpen, setPayosIframeOpen] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const embedPaymentLinkSrc =
    id && typeof window !== 'undefined'
      ? `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/embed/payment-link/${id}`
      : '';

  useEffect(() => {
    if (!payosIframeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPayosIframeOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [payosIframeOpen]);

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

  useEffect(() => {
    gameDataService
      .getItems()
      .then(setItems)
      .catch((err) => {
        console.error('Failed to fetch items:', err);
      });
  }, []);

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
      setUpdatingXu(true);
      await userService.updateUserXu(id, xu);
      alert('Xu updated successfully');
      setXuConfirmOpen(false);
    } catch (error) {
      console.error('Failed to update Xu:', error);
    } finally {
      setUpdatingXu(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!id || user?.isVerified) return;
    if (
      !confirm(
        'Xác nhận email cho tài khoản này? User sẽ có thể đăng nhập bằng email và mật khẩu (nếu đã đặt mật khẩu).',
      )
    ) {
      return;
    }
    try {
      setVerifyingEmail(true);
      await userService.verifyEmail(id);
      setUser((u) => (u ? { ...u, isVerified: true } : null));
      alert('Đã xác nhận email.');
    } catch (error) {
      console.error('Failed to verify email:', error);
      alert('Không thể xác nhận email.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleRevokeRefreshToken = async () => {
    if (!id) return;
    if (
      !confirm(
        'Thu hồi refresh token: user sẽ không thể gia hạn phiên, và sẽ bị đăng xuất khi access token hết hạn (5 phút). Tiếp tục?',
      )
    ) {
      return;
    }
    try {
      setRevoking(true);
      await userService.revokeRefreshToken(id);
      alert('Đã thu hồi refresh token.');
    } catch (error) {
      console.error('Failed to revoke refresh token:', error);
      alert('Không thể thu hồi refresh token.');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="relative z-0 p-6 space-y-6 bg-gradient-to-br from-background to-slate-50/50 min-h-screen">
        <Skeleton className="h-8 w-32" />
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative z-0 p-6 bg-gradient-to-br from-background to-slate-50/50 min-h-screen">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive">User not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const saveGame = (user.saveGame ?? null) as Record<string, unknown> | null;

  const characterLevels: Record<string, number> = (() => {
    if (!saveGame || typeof saveGame !== 'object') return {};
    const raw = (saveGame as Record<string, unknown>).characterLevel as unknown;
    const out: Record<string, number> = {};

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === 'number') {
          out[key] = value;
        }
      }
    } else if (Array.isArray(raw)) {
      for (const entry of raw as unknown[]) {
        if (
          entry &&
          typeof entry === 'object' &&
          typeof (entry as any).id === 'string' &&
          typeof (entry as any).level === 'number'
        ) {
          out[(entry as any).id] = (entry as any).level;
        }
      }
    }

    return out;
  })();

  const unlockedCharactersFromSave: string[] = (() => {
    if (!saveGame || typeof saveGame !== 'object') return [];
    const raw = (saveGame as any).unlockedCharacters as unknown;
    if (Array.isArray(raw)) {
      return (raw as unknown[]).filter((id): id is string => typeof id === 'string');
    }
    return Object.keys(characterLevels);
  })();

  const ownedCharactersFromDb = Array.isArray(user.ownedCharacters) ? user.ownedCharacters : [];

  const ownedCharacterCards = unlockedCharactersFromSave.map((nameId) => {
    const fromDb = ownedCharactersFromDb.find(
      (c: any) => c && typeof c.nameId === 'string' && c.nameId === nameId,
    );
    const level = characterLevels[nameId];

    const characterCard: CharacterCardData = fromDb
      ? {
          _id: String((fromDb as any)._id ?? nameId),
          name: String((fromDb as any).name ?? nameId),
          nameId,
          description: typeof (fromDb as any).description === 'string' ? (fromDb as any).description : undefined,
          element: typeof (fromDb as any).element === 'string' ? (fromDb as any).element : undefined,
          status: (fromDb as any).status,
        }
      : {
          _id: nameId,
          name: nameId,
          nameId,
        };

    return { nameId, level, characterCard };
  });

  const totalCoin = typeof (saveGame as any)?.totalCoin === 'number' ? (saveGame as any).totalCoin : 0;

  const itemLevelMap: Record<string, number> = (() => {
    if (!saveGame || typeof saveGame !== 'object') return {};
    const raw = (saveGame as any).itemLevel as unknown;
    const out: Record<string, number> = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === 'number') {
          out[key] = value;
        }
      }
    }
    return out;
  })();

  const unlockedItems = Object.entries(itemLevelMap)
    .filter(([, lvl]) => lvl >= 1)
    .map(([nameId, lvl]) => {
      const base = items.find((it) => it.nameId === nameId);
      return { nameId, level: lvl, base };
    });

  return (
    <div className="relative z-[1000] p-6 space-y-6 bg-gradient-to-br from-background to-slate-50/50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          onClick={() => navigate('/users')}
          variant="ghost"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
        >
          <span className="text-base">←</span>
          <span>Back to Users</span>
        </Button>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-slate-500">Status:</span>
          {isBanned ? (
            <Badge variant="destructive">Banned</Badge>
          ) : (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Active
            </Badge>
          )}
        </div>
      </div>

      <PageHeader
        title="User Details"
        description={`Manage account & permissions for ${user.email}`}
      />

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-0 shadow-lg xl:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl text-slate-900">{user.email}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Role:{' '}
                  <span className="font-medium text-slate-700">
                    {user.role}
                  </span>
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-100">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase shrink-0">
                Xác nhận email
              </p>
              {user.isVerified ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Đã xác nhận
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50/80">
                    Chưa xác nhận
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerifyEmail}
                    disabled={verifyingEmail}
                    className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-sm"
                  >
                    {verifyingEmail ? 'Đang xử lý…' : 'Xác nhận email (admin)'}
                  </Button>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  💰 Currency (Xu)
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={xu}
                    onChange={(e) => setXu(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  />
                  <Button
                    onClick={() => setXuConfirmOpen(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                  >
                    Update
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Account Status
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={() => setPayosIframeOpen(true)}
                    variant="outline"
                    className="w-full sm:w-auto border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    Tạo link nạp (PayOS)
                  </Button>
                  <Button
                    onClick={handleBanToggle}
                    variant={isBanned ? 'default' : 'destructive'}
                    className={`w-full sm:w-auto ${
                      isBanned
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md'
                        : ''
                    }`}
                  >
                    {isBanned ? 'Unban User' : 'Ban User'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg h-full">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Session & Security
            </CardTitle>
            <CardDescription>
              Quản lý phiên đăng nhập và refresh token của user
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <Button
              onClick={handleRevokeRefreshToken}
              disabled={revoking}
              variant="outline"
              className="w-full justify-center border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              {revoking ? 'Đang xử lý…' : 'Thu hồi refresh token'}
            </Button>
            <p className="text-xs text-slate-500">
              User sẽ tự động đăng xuất khi access token hiện tại hết hạn (khoảng 5 phút). Hành động
              này không thu hồi access token ngay lập tức.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span>⚔️</span>
              <span>Owned Characters</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {ownedCharacterCards.length} characters unlocked (theo saveGame)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {ownedCharacterCards.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No characters in saveGame
              </p>
            ) : (
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                variants={fadeSlideCard}
                initial="hidden"
                animate="visible"
              >
                {ownedCharacterCards.map(({ nameId, level, characterCard }, index) => {
                  const safeLevel = typeof level === 'number' ? level : 1;
                  return (
                    <motion.div
                      key={nameId}
                      className="min-w-0"
                      variants={fadeSlideCard}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                    >
                      <CharacterCard
                        character={characterCard}
                        variant="compact"
                        level={safeLevel}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <span>🎁</span>
                <span>Unlocked Items</span>
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                Coin: {totalCoin.toLocaleString()}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Item level & trạng thái mở khóa (từ saveGame)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {unlockedItems.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Chưa có item nào được mở khóa trong saveGame
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {unlockedItems.map(({ nameId, level, base }) => {
                  const displayLevel = Math.max(1, level);
                  const imageSrc = getDefaultItemImageUrl(nameId);
                  const displayName = base?.nameId ? `item.${base.nameId}` : nameId;
                  return (
                    <div
                      key={nameId}
                      className="relative rounded-lg bg-slate-50 border border-slate-200 p-2 flex flex-col items-center gap-1"
                    >
                      <div className="relative w-full max-w-[72px] aspect-square">
                        <img
                          src={imageSrc}
                          alt={displayName}
                          className="absolute inset-0 w-full h-full object-cover rounded-md shadow-sm"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              '/assets/images/item/empty.webp';
                          }}
                        />
                        <div className="absolute top-1 right-1">
                          <span className="inline-flex items-center rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                            Lv.{displayLevel}
                          </span>
                        </div>
                      </div>
                      <div className="w-full text-center">
                        <p className="text-[11px] font-semibold text-slate-800 truncate">
                          {nameId}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {nameId}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {xuConfirmOpen && (
              <motion.div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
                variants={fadeInOverlay}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div
                  className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-slate-200 p-5 space-y-4"
                  variants={zoomInPopup}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-slate-900">Xác nhận cập nhật Xu</h2>
                    <p className="text-xs text-slate-500">
                      Bạn có chắc muốn đặt số Xu của user này thành{' '}
                      <span className="font-semibold text-slate-900">
                        {xu.toLocaleString()}
                      </span>
                      ?
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-slate-600 border-slate-200"
                      disabled={updatingXu}
                      onClick={() => setXuConfirmOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                      onClick={handleUpdateXu}
                      disabled={updatingXu}
                    >
                      {updatingXu ? 'Đang cập nhật...' : 'Xác nhận'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {payosIframeOpen && id && (
              <motion.div
                className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4"
                role="presentation"
                variants={fadeInOverlay}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setPayosIframeOpen(false);
                }}
              >
                <motion.div
                  className="flex flex-col w-full max-w-3xl h-[min(90vh,880px)] rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Tạo link thanh toán PayOS"
                  variants={zoomInPopup}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/90">
                    <h2 className="text-sm font-semibold text-slate-900">Tạo link nạp (PayOS)</h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 hover:text-slate-900"
                      onClick={() => setPayosIframeOpen(false)}
                    >
                      Đóng
                    </Button>
                  </div>
                  <iframe
                    key={embedPaymentLinkSrc}
                    title="Tạo link thanh toán PayOS"
                    src={embedPaymentLinkSrc}
                    className="w-full flex-1 min-h-0 border-0 bg-white"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

