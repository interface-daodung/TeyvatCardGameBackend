import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { paymentService, PayosPaymentLinkData } from '../services/paymentService';
import { userService, User } from '../services/userService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { QRCodeSVG } from 'qrcode.react';
import { fadeSlideCard } from '../components/animations/motionPresets';

const PACKAGES = [
  { name: 'Starter Pack', label: 'Starter Pack (2,000 VND -> 20,000 Xu)' },
  { name: '10k Pack', label: '10k Pack (10,000 VND -> 10,000 Xu)' },
  { name: '20k Pack', label: '20k Pack (20,000 VND -> 25,000 Xu)' },
  { name: '50k Pack', label: '50k Pack (50,000 VND -> 75,000 Xu)' },
];

export default function CreatePaymentLink() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const playerFromRouteLocked = Boolean(routeUserId);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]?.name ?? '');
  const [userQuery, setUserQuery] = useState('');
  const [isUserInputFocused, setIsUserInputFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PayosPaymentLinkData | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (routeUserId) {
          const u = await userService.getUserById(routeUserId);
          setUsers([u]);
          setSelectedUid(u._id);
          setUserQuery(u.email);
        } else {
          const data = await userService.getUsers(1, 200);
          setUsers(data.users);
        }
      } catch {
        setError(
          routeUserId
            ? 'Player not found or failed to load data'
            : 'Failed to load player list',
        );
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [routeUserId]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 10);
    return users.filter((u) => u.email.toLowerCase().includes(q)).slice(0, 10);
  }, [users, userQuery]);

  const shouldShowUserSuggestions = useMemo(() => {
    if (playerFromRouteLocked) return false;
    if (!isUserInputFocused) return false;
    if (filteredUsers.length === 0) return false;
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    if (filteredUsers.length === 1 && filteredUsers[0].email.toLowerCase() === q) {
      return false;
    }
    return true;
  }, [filteredUsers, userQuery, isUserInputFocused, playerFromRouteLocked]);

  const handleCreatePayment = async () => {
    if (!selectedUid) {
      setError('Please select a player');
      return;
    }
    setCreating(true);
    setError(null);
    setPaymentData(null);
    try {
      const res = await paymentService.createPayosLink(selectedUid, selectedPackage);
      if (res.error === 0 && res.data) {
        setPaymentData(res.data);
        setShowForm(false);
      } else {
        setError(res.message || 'Failed to create payment link');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Connection error');
    } finally {
      setCreating(false);
    }
  };

  const showCopied = (label: string) => {
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(String(text));
    setError(null);
    showCopied(label);
  };

  const handleCreateAnother = () => {
    setPaymentData(null);
    setShowForm(true);
    setError(null);
    setCopiedLabel(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-slate-200 rounded mb-4" />
        <div className="animate-pulse h-32 w-full bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {!playerFromRouteLocked && (
        <PageHeader
          title="Create payment link"
          description="For Admin/Mod: create a PayOS payment link when a player asks for top-up support."
        />
      )}

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" className="space-y-6">
      {showForm && (
      <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white max-w-2xl shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Create support payment link
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {playerFromRouteLocked
              ? 'The player is pre-selected from the user detail page. Choose a package and create the link.'
              : 'Select a player and a top-up package, then send them the payment link via support message.'}
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Player (user needing support)
              </label>
              {playerFromRouteLocked && (
                <p className="text-xs text-slate-500 mb-1.5">
                  Locked to the user from URL - cannot be changed here.
                </p>
              )}
              <div className="relative">
                <input
                  type="text"
                  readOnly={playerFromRouteLocked}
                  value={userQuery}
                  onChange={(e) => {
                    if (playerFromRouteLocked) return;
                    setUserQuery(e.target.value);
                    setSelectedUid('');
                  }}
                  onFocus={() => !playerFromRouteLocked && setIsUserInputFocused(true)}
                  onBlur={() => setIsUserInputFocused(false)}
                  placeholder="Enter player email to search..."
                  className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
                    playerFromRouteLocked
                      ? 'bg-slate-100 text-slate-800 cursor-not-allowed'
                      : 'bg-white'
                  }`}
                />
                {shouldShowUserSuggestions && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredUsers.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedUid(u._id);
                          setUserQuery(u.email);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                          selectedUid === u._id ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <span className="font-medium text-slate-800">{u.email}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {u.role === 'user' ? 'player' : u.role}
                        </span>
                      </button>
                    ))}
                    {users.length > filteredUsers.length && (
                      <div className="px-3 py-1 text-xs text-slate-400 border-t border-slate-100">
                        Showing {filteredUsers.length} / {users.length} users (filtered by email)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Top-up package
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              >
                {PACKAGES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleCreatePayment}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? 'Creating...' : 'Create payment link'}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </CardContent>
      </Card>
      )}

      {paymentData && !showForm && (
        <motion.div variants={fadeSlideCard} initial="hidden" animate="visible">
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 max-w-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  Payment link created
                </h3>
                <p className="text-sm text-slate-600">
                  Send this link or guide the player to scan VietQR / transfer using the details below.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={handleCreateAnother}
              >
                Create another link
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0 flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100">
                  <QRCodeSVG
                    value={paymentData.qrCode}
                    level="M"
                    size={200}
                    includeMargin
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-slate-600">Account name:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{paymentData.accountName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy(paymentData.accountName, 'Account Name')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-slate-600">Account number:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{paymentData.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy(paymentData.accountNumber, 'Account Number')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-slate-600">Amount:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{paymentData.amount.toLocaleString('vi-VN')} VND</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy(String(paymentData.amount), 'Amount')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm text-slate-600">Description:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold text-sm break-all">{paymentData.description}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs flex-shrink-0"
                      onClick={() => handleCopy(paymentData.description, 'Description')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Order code: #{paymentData.orderCode} - Package: {paymentData.packageName} ({paymentData.xuReceived} Xu)
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleCopy(paymentData.checkoutUrl, 'Payment Link')}
                  >
                    {copiedLabel === 'Payment Link' ? 'Copied!' : 'Copy payment link'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentData.checkoutUrl, '_blank')}
                  >
                    Open PayOS checkout page
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}
      </motion.div>
    </div>
  );
}
