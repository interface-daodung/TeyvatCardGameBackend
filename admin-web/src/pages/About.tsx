import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faServer,
  faDisplay,
  faGamepad,
  faPlug,
  faEnvelope,
  faCodeBranch,
  faCog,
  faCreditCard,
  faKey,
  faPalette,
  faRocket,
} from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const DEVELOPER = {
  name: 'Đào Mạnh Dũng',
  role: 'Developer',
  github: 'https://github.com/interface-daodung',
  email: 'interface.daodung@gmail.com',
};

const BACKEND_TECH = [
  'Node.js',
  'Express',
  'TypeScript',
  'MongoDB (Mongoose)',
  'JWT (jsonwebtoken)',
  'bcrypt',
  'Zod (validation)',
  'Pino (logging)',
  'CORS, cookie-parser',
  'REST + Multer (upload file ảnh, lưu vào uploads/)',
];

const FRONTEND_TECH = [
  'React 18',
  'TypeScript',
  'Vite',
  'React Router',
  'Tailwind CSS',
  'Axios',
  'Recharts',
  'React Hook Form + Zod',
  'FontAwesome',
];

/** Công nghệ Teyvat Card (game client) – theo TeyvatCard/README.md */
const TEYVAT_CARD_TECH = {
  core: [
    'TypeScript',
    'Phaser 3.87.0 (game framework)',
    'Vite 6.2.0 (build & dev server)',
    'RexUI (UI components cho game)',
    'ES6 Modules',
  ],
  additional: [
    'Sharp (xử lý ảnh, sprite sheets)',
    'HTML5 Canvas (rendering)',
    'CSS3 (styling, animations)',
    'GitHub Actions (auto-deploy)',
  ],
  highlights: [
    'Card-based combat, turn-based gameplay',
    'AnimationManager, AssetManager, CardManager',
    'Sprite sheet optimization',
    'Đa ngôn ngữ (EN, VI, JA)',
  ],
};

const EXTERNAL_SERVICES = [
  {
    name: 'PayOS',
    description: 'Cổng thanh toán Việt Nam. Tích hợp qua @payos/node để tạo link thanh toán, webhook xác nhận giao dịch.',
    link: 'https://payos.vn',
    icon: faCreditCard,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    name: 'Google Authentication',
    description: 'Xác thực đăng nhập bằng tài khoản Google (google-auth-library). Hỗ trợ đăng nhập admin và người chơi bằng OAuth.',
    link: 'https://developers.google.com/identity',
    icon: faKey,
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
];

export default function About() {
  return (
    <div className="p-4 space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-amber-500/10 p-6 border border-violet-200/50">
        <PageHeader
          title="About"
          description="Thông tin dự án, công nghệ sử dụng và dịch vụ bên thứ ba"
        />
        <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
          <FontAwesomeIcon icon={faRocket} className="text-violet-500" />
          Made with care for Teyvat Card Game
        </p>
      </div>

      <Card className="overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
            </span>
            Người phát triển
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-semibold text-lg text-slate-800">{DEVELOPER.name}</p>
          <p className="text-muted-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faCog} className="text-amber-500 text-sm" />
            {DEVELOPER.role}
          </p>
          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <a
              href={DEVELOPER.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
            >
              <FontAwesomeIcon icon={faCodeBranch} className="text-slate-600" />
              GitHub
            </a>
            <a
              href={`mailto:${DEVELOPER.email}`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
            >
              <FontAwesomeIcon icon={faEnvelope} className="text-slate-600" />
              {DEVELOPER.email}
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <FontAwesomeIcon icon={faServer} className="h-5 w-5" />
            </span>
            Công nghệ Backend (Server)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            {BACKEND_TECH.map((tech) => (
              <li key={tech} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {tech}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
              <FontAwesomeIcon icon={faDisplay} className="h-5 w-5" />
            </span>
            Công nghệ Frontend (Admin Web)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            {FRONTEND_TECH.map((tech) => (
              <li key={tech} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {tech}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-fuchsia-500 bg-gradient-to-r from-fuchsia-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-md">
              <FontAwesomeIcon icon={faGamepad} className="h-5 w-5" />
            </span>
            Công nghệ Teyvat Card (Game)
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal mt-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faPalette} className="text-fuchsia-500 text-xs" />
            Game chiến đấu thẻ bài theo lượt – theo TeyvatCard/README.md
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faCog} className="text-fuchsia-500 text-sm" />
              Core
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
              {TEYVAT_CARD_TECH.core.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faRocket} className="text-fuchsia-500 text-sm" />
              Công cụ bổ sung
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
              {TEYVAT_CARD_TECH.additional.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faPalette} className="text-fuchsia-500 text-sm" />
              Tính năng kỹ thuật
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
              {TEYVAT_CARD_TECH.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50/50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
              <FontAwesomeIcon icon={faPlug} className="h-5 w-5" />
            </span>
            Dịch vụ & công nghệ bên ngoài
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {EXTERNAL_SERVICES.map((service) => (
            <div
              key={service.name}
              className={`rounded-xl border ${service.borderColor} ${service.bgLight} p-4 transition-shadow hover:shadow-md`}
            >
              <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${service.gradient} text-white text-sm`}
                >
                  <FontAwesomeIcon icon={service.icon} />
                </span>
                {service.name}
              </h4>
              <p className="text-sm text-slate-600 mt-1 ml-10">{service.description}</p>
              <a
                href={service.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 ml-10 inline-flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faPlug} className="text-xs" />
                {service.link}
              </a>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
