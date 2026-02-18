import { useEffect, useState } from 'react';
import { paymentService, PayosPaymentLinkData } from '../services/paymentService';
import { userService, User } from '../services/userService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { QRCodeSVG } from 'qrcode.react';

const PACKAGES = ['Gói 100', 'Gói 500', 'Gói 1000', 'Gói 5000', 'Gói 10000'];

export default function CreatePaymentLink() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PayosPaymentLinkData | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await userService.getUsers(1, 50);
        setUsers(data.users);
        if (data.users.length > 0) setSelectedUid(data.users[0]._id);
      } catch {
        setError('Không thể tải danh sách người chơi');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleCreatePayment = async () => {
    if (!selectedUid) {
      setError('Vui lòng chọn người chơi');
      return;
    }
    setCreating(true);
    setError(null);
    setPaymentData(null);
    try {
      const res = await paymentService.createPayosLink(selectedUid, selectedPackage);
      if (res.error === 0 && res.data) {
        setPaymentData(res.data);
      } else {
        setError(res.message || 'Tạo link thất bại');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối');
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
      <PageHeader
        title="Tạo link thanh toán"
        description="Dành cho Admin/Mod: tạo link thanh toán PayOS khi người chơi yêu cầu hỗ trợ nạp tiền."
      />

      <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white max-w-2xl shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Tạo link thanh toán hỗ trợ
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Chọn người chơi và gói nạp, sau đó gửi link thanh toán cho họ qua tin nhắn hỗ trợ.
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Người chơi (user cần hỗ trợ)
              </label>
              <select
                value={selectedUid}
                onChange={(e) => setSelectedUid(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              >
                <option value="">-- Chọn người chơi --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email} {u.role === 'user' ? '' : `(${u.role})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gói nạp
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              >
                {PACKAGES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleCreatePayment}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? 'Đang tạo...' : 'Tạo link thanh toán'}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {paymentData && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 max-w-2xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Link thanh toán đã tạo
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Gửi link hoặc hướng dẫn người chơi quét mã VietQR / chuyển khoản theo thông tin bên dưới.
            </p>
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
                  <span className="text-sm text-slate-600">Chủ tài khoản:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{paymentData.accountName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy(paymentData.accountName, 'Chủ TK')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-slate-600">Số tài khoản:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{paymentData.accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy(paymentData.accountNumber, 'STK')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-slate-600">Số tiền:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{paymentData.amount.toLocaleString('vi-VN')} VND</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopy(String(paymentData.amount), 'Số tiền')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm text-slate-600">Nội dung:</span>
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold text-sm break-all">{paymentData.description}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs flex-shrink-0"
                      onClick={() => handleCopy(paymentData.description, 'Nội dung')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Mã đơn: #{paymentData.orderCode} • Gói: {paymentData.packageName} ({paymentData.xuReceived} xu)
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleCopy(paymentData.checkoutUrl, 'Link thanh toán')}
                  >
                    {copiedLabel === 'Link thanh toán' ? '✓ Đã copy!' : 'Sao chép link thanh toán'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentData.checkoutUrl, '_blank')}
                  >
                    Mở trang thanh toán PayOS
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
