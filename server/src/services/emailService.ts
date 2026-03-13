import { Resend } from 'resend';

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set. Please configure it in the server environment.');
  }
  return new Resend(key);
}

function getVerifyBaseUrl(): string {
  const fromEnv = process.env.EMAIL_VERIFY_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  //fallback to localhost:3000 for development
  console.error('EMAIL_VERIFY_BASE_URL not set, fallback to localhost:3000');
  const isDev = process.env.NODE_ENV !== 'production';
  return isDev ? 'http://localhost:3000' : 'https://teyvatcard.site';
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = getVerifyBaseUrl();
  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

  const mailBgUrl = `https://cdn.oneesports.gg/cdn-data/2022/12/GenshinImpact_MaguuKenki_GeniusInvokationTCG-1536x864.webp`;
  const iconUrl = `https://raw.githubusercontent.com/interface-daodung/TeyvatCardGameBackend/refs/heads/main/admin-web/public/icon-192.webp`;

  const resend = getResendClient();

  const payload = {
    from: 'TeyvatCard <no-reply@teyvatcard.site>',
    to: email,
    subject: 'Xác nhận email cho TeyvatCard',
    html: `
     <div style="margin:0;padding:24px;background:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="width:100%;max-width:520px;margin:0 auto;border-radius:24px;overflow:hidden;border:1px solid rgba(148,163,184,0.4);box-shadow:0 24px 80px rgba(15,23,42,0.9);background:#ffffff;">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            background="${mailBgUrl}"
            style="border-collapse:collapse;background-position:center center;background-repeat:no-repeat;background-size:cover;"
          >
            <tr>
              <td height="200">
                <table width="100%" height="200" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" valign="top" style="background-color:rgba(23, 31, 84, 0.8);padding:24px 26px 20px;">
                      <div style="padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid rgba(148,163,184,0.3);">
                        <div style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:hsl(213,97%,87%);margin-bottom:8px;">
                          Welcome to
                        </div>
                        <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:rgba(15,23,42,0.85);border:1px solid rgba(191,219,254,0.7);">
                          <img
                            src="${iconUrl}"
                            width="28"
                            height="28"
                            alt="TeyvatCard"
                            style="border-radius:999px;display:block;border:1px solid rgba(191,219,254,0.9);box-shadow:0 0 0 2px rgba(15,23,42,0.9);"
                          />
                          <span style="font-size:16px;font-weight:700;background:linear-gradient(to right,hsl(214,100%,97%),hsl(213,97%,87%));-webkit-background-clip:text;background-clip:text;color:transparent;">
                            TeyvatCard
                          </span>
                        </div>
                      </div>

                      <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#e5e7eb;">
                        Xác nhận email của bạn
                      </h1>
                      <p style="font-size:14px;line-height:1.6;color:hsl(214,95%,93%);margin:0 0 18px;">
                        Còn một bước nữa thôi! Nhấn nút bên dưới để xác nhận email và kích hoạt tài khoản TeyvatCard.
                      </p>

                      <div style="text-align:center;margin:18px 0 16px;">
                        <a href="${verifyUrl}" style="display:inline-block;padding:11px 26px;border-radius:999px;background:linear-gradient(to right,hsl(217,91%,60%),hsl(224,76%,48%));color:#f9fafb;font-size:14px;font-weight:600;text-decoration:none;border:1px solid rgba(191,219,254,0.8);box-shadow:0 10px 30px rgba(59,130,246,0.7);">
                          Xác nhận email
                        </a>
                      </div>

                      <p style="font-size:12px;line-height:1.5;color:hsl(214,95%,93%);margin:0 0 8px;">
                        Hoặc dán đường dẫn này vào trình duyệt:
                      </p>
                      <p style="font-size:11px;line-height:1.6;color:hsl(213,97%,87%);word-break:break-all;margin:0 0 14px;text-shadow:0 0 6px rgba(15,23,42,0.9);">
                        ${verifyUrl}
                      </p>

                      <p style="font-size:12px;line-height:1.5;color:hsl(214,95%,93%);margin:0 0 8px;">
                        Link chỉ có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không tạo tài khoản, hãy bỏ qua email này.
                      </p>

                      <div style="font-size:11px;color:hsl(214,100%,97%);border:1px solid rgba(148,163,184,0.25);border-radius:16px;padding:14px 16px;margin-top:20px;background:rgba(15,23,42,0.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-shadow:0 0 6px rgba(15,23,42,0.9);">
                        <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:hsl(213,97%,87%);margin-bottom:4px;text-shadow:0 0 4px rgba(15,23,42,0.9);">
                          From the world of Teyvat
                        </div>
                        <div>
                          Đây là email tự động, vui lòng không trả lời. © ${new Date().getFullYear()} TeyvatCard.
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `,
  };

  console.log('[sendVerificationEmail] sending email via Resend', {
    to: email,
    hasHtml: !!payload.html,
    htmlLength: payload.html.length,
  });

  try {
    const result = await resend.emails.send(payload);
    console.log('[sendVerificationEmail] Resend response', result);
    return result;
  } catch (error) {
    console.error('[sendVerificationEmail] Resend error', error);
    throw error;
  }
}

