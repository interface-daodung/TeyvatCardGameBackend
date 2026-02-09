import { useEffect, useState } from 'react';
import { paymentService, PayosPaymentLinkData } from '../services/paymentService';
import { userService, User } from '../services/userService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

const PACKAGES = ['Gói 100', 'Gói 500', 'Gói 1000', 'Gói 5000', 'Gói 10000'];

export default function TestPayos() {
  const [users, setUsers] = useState<User[]>([]);
  const [testUid, setTestUid] = useState('');
  const [testPackage, setTestPackage] = useState(PACKAGES[0]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PayosPaymentLinkData | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await userService.getUsers(1, 50);
        setUsers(data.users);
        if (data.users.length > 0) setTestUid(data.users[0]._id);
      } catch {
        setError('Không thể tải danh sách user');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleCreatePayment = async () => {
    if (!testUid) {
      setError('Chọn user để tạo thanh toán');
      return;
    }
    setCreating(true);
    setError(null);
    setPaymentData(null);
    try {
      const res = await paymentService.createPayosLink(testUid, testPackage);
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(String(text));
    setError(null);
    // Có thể thêm toast nếu cần
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
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
          Test PayOS
        </h1>
        <p className="text-muted-foreground">
          Tạo màn hình thanh toán QR để kiểm tra tích hợp PayOS
        </p>
      </div>

      <Card className="border border-amber-200 bg-amber-50/50 max-w-2xl">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-4">
            Tạo màn hình thanh toán
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chọn user (người chơi)
              </label>
              <select
                value={testUid}
                onChange={(e) => setTestUid(e.target.value)}
                className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              >
                <option value="">-- Chọn user --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email} {u.role === 'user' ? '(user)' : `(${u.role})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chọn gói nạp
              </label>
              <select
                value={testPackage}
                onChange={(e) => setTestPackage(e.target.value)}
                className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
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
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {creating ? 'Đang tạo...' : 'Tạo màn hình thanh toán QR'}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {paymentData && (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50 max-w-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Màn hình thanh toán QR
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Mở App Ngân hàng để quét mã VietQR hoặc chuyển khoản theo thông tin bên dưới
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0 flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-inner">
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
                  <div className="flex gap-1">
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
                  <div className="flex gap-1">
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
                  <div className="flex gap-1">
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
                <p className="text-xs text-amber-700 mt-2">
                  Mã đơn: #{paymentData.orderCode} • Gói: {paymentData.packageName} ({paymentData.xuReceived}xu)
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => window.open(paymentData.checkoutUrl, '_blank')}
                >
                  Mở trang thanh toán PayOS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
