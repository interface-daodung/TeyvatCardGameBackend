import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../services/authService';
import { Card, CardContent } from '../components/ui/card';

const PACKAGES = [
  { id: 'starter-pack', name: 'Gói tân thủ', xu: 100, price: '9.000đ', description: 'Dành cho người mới bắt đầu' },
  { id: 'small-gems', name: 'Gói xu nhỏ', xu: 500, price: '39.000đ', description: 'Xu nhỏ cho nhu cầu cơ bản' },
  { id: 'medium-gems', name: 'Gói xu vừa', xu: 1200, price: '89.000đ', description: 'Tiết kiệm 15% so với gói nhỏ' },
  { id: 'large-gems', name: 'Gói xu lớn', xu: 3000, price: '199.000đ', description: 'Ưu đãi lớn nhất - tiết kiệm 25%' },
] as const;

type PackageId = (typeof PACKAGES)[number]['id'];

const CopyIcon = () => (
  <svg viewBox="0 0 115.77 122.88" className="w-5 h-5" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z" />
  </svg>
);

export default function UserPayments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<PackageId>('starter-pack');

  const userId = authService.getUserId();
  const userRole = authService.getUserRole();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }

    if (userRole !== 'user') {
      navigate('/', { replace: true });
      return;
    }

    if (id !== userId) {
      navigate(`/user/${userId}/Payments`, { replace: true });
      return;
    }
  }, [id, userId, userRole, navigate]);

  useEffect(() => {
    const hash = location.hash.slice(1) as PackageId;
    if (hash && PACKAGES.some((p) => p.id === hash)) {
      setSelectedPackage(hash);
    }
  }, [location.hash]);

  const pkg = PACKAGES.find((p) => p.id === selectedPackage) ?? PACKAGES[0];

  // Tạo chuỗi thô chứa đủ thông tin: userId + gói + timestamp + randomNonce
  const randomNonce = Math.floor(Math.random() * 1_000_000_000);
  const rawTransactionString = `${id ?? ''}|${pkg.id}|${Date.now()}|${randomNonce}`;

  // Hash đơn giản 32-bit từ chuỗi trên
  let hash = 0;
  for (let i = 0; i < rawTransactionString.length; i++) {
    hash = (hash * 31 + rawTransactionString.charCodeAt(i)) >>> 0;
  }

  // Chuỗi base36 chính từ hash
  let base36 = Math.abs(hash).toString(36).toUpperCase();

  // Nếu chưa đủ 8 ký tự, bổ sung thêm từ một "md5-like" random string để tránh phải pad '0'
  if (base36.length < 8) {
    const extraSource = `${rawTransactionString}|${Math.random()}`;
    let extraHash = 0;
    for (let i = 0; i < extraSource.length; i++) {
      extraHash = (extraHash * 31 + extraSource.charCodeAt(i)) >>> 0;
    }
    const extraBase36 = Math.abs(extraHash).toString(36).toUpperCase();
    base36 = (base36 + extraBase36).slice(0, 8);
  }

  // Đảm bảo đúng 8 ký tự (nếu dài hơn thì cắt)
  const transactionCode = base36.slice(0, 8);

  const transactionId = `TEYVAT-${transactionCode}`;

  const qrValue = `TEYVAT-PAY|${id}|${pkg.id}|${pkg.xu}|${pkg.price}|${transactionId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transactionId);
    } catch {
      const input = document.createElement('input');
      input.value = transactionId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  if (!authService.isAuthenticated() || userRole !== 'user' || id !== userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Nạp Xu - Teyvat Card Game
          </h1>
          <p className="text-slate-600 mt-1">Quét mã QR để thanh toán</p>
        </div>

        <div className="flex justify-center">
          <Card className="border-0 shadow-xl overflow-hidden w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl border-2 border-amber-200 shadow-inner mb-4">
                  <QRCodeSVG value={qrValue} size={200} level="H" />
                </div>
                <p className="text-sm text-slate-500 mb-2">Quét mã QR bằng app ngân hàng</p>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-lg text-amber-700">{pkg.name}</p>
                  <p className="text-2xl font-bold text-amber-600">{pkg.price}</p>
                  <p className="text-slate-600">
                    Nhận <span className="font-bold text-amber-600">{pkg.xu.toLocaleString()}</span> Xu
                  </p>
                </div>
                <div className="w-fit mt-4 space-y-1 flex gap-3">
                  <div className="py-2 text-lg text-slate-600 block">Nội dung chuyển tiền</div>
                    <input
                      type="text"
                      readOnly
                      value={transactionId}
                      size={transactionId.length + 1}
                      className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all cursor-text"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-600 hover:text-amber-600 transition-colors"
                      title="Sao chép"
                    >
                      <CopyIcon />
                    </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
