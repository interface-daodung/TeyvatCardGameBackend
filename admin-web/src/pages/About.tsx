import { useState } from 'react';
import { motion } from 'framer-motion';
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
import { fadeSlideCard, slideUpItem, flipVerticalCard } from '../components/animations/motionPresets';

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
  'ts-morph (phân tích AST / codegen)',
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
  'Framer Motion',
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
    description:
      'Cổng thanh toán Việt Nam. Tích hợp qua @payos/node để tạo link thanh toán, webhook xác nhận giao dịch.',
    link: 'https://payos.vn',
    icon: faCreditCard,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    logoLabel: 'PayOS',
    logoUrl: '/assets/images/about/PayOS.svg',
  },
  {
    name: 'mymemory',
    description:
      'Dịch vụ dịch máy bên ngoài, dùng để dịch văn bản đa ngôn ngữ thông qua API của MyMemory.',
    link: 'https://mymemory.translated.net',
    icon: faPlug,
    gradient: 'from-white to-white',
    bgLight: 'bg-white',
    borderColor: 'border-[#006caa]',
    logoLabel: 'MyMemory',
    logoUrl:
      'https://forumcdn.freemdict.com/uploads/default/original/3X/4/0/400328b058aec4c2068ecdf2fc2beafbdc13bd02.png',
  },
  {
    name: 'Google Authentication',
    description:
      'Xác thực đăng nhập bằng tài khoản Google (google-auth-library). Hỗ trợ đăng nhập admin và người chơi bằng OAuth.',
    link: 'https://developers.google.com/identity',
    icon: faKey,
    // gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    logoLabel: 'Google',
    logoUrl: '/assets/images/about/Google Authentication 2.png',
  },
  {
    name: 'Resend',
    description:
      'Nền tảng email transactional. Backend sử dụng Resend để gửi email hệ thống (xác thực, thông báo) – bản thân Resend cũng là một lớp hạ tầng email chuyên dụng.',
    link: 'https://resend.com',
    icon: faEnvelope,
    gradient: 'from-slate-500 to-slate-600',
    bgLight: 'bg-slate-100',
    borderColor: 'border-slate-200',
    logoLabel: 'Resend',
    logoUrl: 'https://resend.com/static/favicons/favicon@180x180.png?v=1',
  },
  {
    name: 'Cloudflare',
    description:
      'Nền tảng hạ tầng web toàn cầu: DNS, CDN, bảo mật và proxy. Được dùng như một lớp công nghệ nền để tối ưu hiệu năng và bảo vệ dịch vụ.',
    link: 'https://www.cloudflare.com',
    icon: faServer,
    // gradient: 'from-orange-500 to-amber-500',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    logoLabel: 'Cloudflare',
    logoUrl:
      //'https://cf-assets.www.cloudflare.com/dzlvafdwdttg/735eoClKJf9XfkqCJs1mfZ/b6767158f39af8d538517df918b8fc2e/logo-white-desktop.svg',
      'https://play-lh.googleusercontent.com/pv_SHfe2qgxC42a16yAqRULrFs9WHaV9Mvt-cd1G78JdnXeURdksV-J6Fp_UlZYEOA',
  },
  {
    name: 'Ollama',
    description:
      'Nền tảng runtime AI local, cung cấp API key AI nội bộ và quản lý/bật tắt các model chạy trên máy (bao gồm Qwen 2.5).',
    link: 'https://ollama.com',
    icon: faCodeBranch,
    // gradient: 'from-white to-slate-100',
    bgLight: 'bg-white',
    borderColor: 'border-black',
    logoLabel: 'Ollama',
    logoUrl: 'https://images.seeklogo.com/logo-png/59/2/ollama-logo-png_seeklogo-593420.png',
    flipModel: {
      name: 'Qwen 2.5',
      description:
        'Model Qwen 2.5 chạy trên Ollama – mô hình ngôn ngữ mạnh, tối ưu cho tác vụ AI local: gợi ý code, trợ lý in-game và xử lý nội dung nội bộ.',
      logoUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/qwen.webp',
      // gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      borderColor: 'border-violet-500',
    },
  },
];

type ExternalService = (typeof EXTERNAL_SERVICES)[number] & {
  flipModel?: {
    name: string;
    description: string;
    logoUrl?: string;
    gradient: string;
    bgLight: string;
    borderColor: string;
  };
};

function OllamaFlipCard({ service, index }: { service: ExternalService; index: number }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flip = service.flipModel!;

  return (
    <div
      className="relative"
      style={{ perspective: 1000 }}
    >
      <motion.div
        initial="initial"
        animate={isFlipped ? 'hovered' : 'initial'}
        variants={flipVerticalCard}
        className="relative h-full min-h-[190px]"
        style={{ transformStyle: 'preserve-3d' }}
        custom={index}
        whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        {/* Mặt trước: Ollama */}
        <div
          className={`rounded-xl border ${service.borderColor} ${service.bgLight} p-4 transition-shadow hover:shadow-md`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${service.gradient} text-white text-sm overflow-hidden`}
            >
              {service.logoUrl ? (
                <img
                  src={service.logoUrl}
                  alt={service.name}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <FontAwesomeIcon icon={service.icon} />
              )}
            </span>
            <span>{service.name}</span>
            {service.logoLabel && (
              <span className="ml-1 inline-flex items-center rounded-full border border-white/60 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm">
                {service.logoLabel}
              </span>
            )}
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

        {/* Mặt sau: Qwen 2.5 */}
        <div
          className={`absolute inset-0 rounded-xl border ${flip.borderColor} ${flip.bgLight} p-4 flex flex-col justify-between`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
          }}
        >
          <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${flip.gradient} text-white text-sm overflow-hidden`}
            >
              {flip.logoUrl && (
                <img
                  src={flip.logoUrl}
                  alt={flip.name}
                  className="h-8 w-8 object-contain"
                />
              )}
            </span>
            <span>{flip.name}</span>
            <span className="ml-1 inline-flex items-center rounded-full border border-violet-600/70 bg-violet-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 shadow-sm">
              Model
            </span>
          </h4>
          <p className="text-sm text-slate-700 mt-1 ml-10">{flip.description}</p>
          <p className="text-[11px] text-violet-700 font-medium mt-3 ml-10">
            Qwen 2.5 được chạy thông qua Ollama như một công nghệ AI local, phù hợp cho các tác vụ trong game
            và môi trường dev.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function About() {
  return (
    <div className="p-4 space-y-6">
      <motion.div
        className="rounded-2xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-amber-500/10 p-6 border border-violet-200/50"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <PageHeader
          title="About"
          description="Thông tin dự án, công nghệ sử dụng và dịch vụ bên thứ ba"
        />
        <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
          <FontAwesomeIcon icon={faRocket} className="text-violet-500" />
          Made with care for Teyvat Card Game
        </p>
      </motion.div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" custom={0}>
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
      </motion.div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" custom={1}>
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
            <motion.ul
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
            >
              {BACKEND_TECH.map((tech, i) => (
                <motion.li
                  key={tech}
                  variants={slideUpItem}
                  custom={i}
                  className="flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {tech}
                </motion.li>
              ))}
            </motion.ul>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" custom={2}>
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
            <motion.ul
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
            >
              {FRONTEND_TECH.map((tech, i) => (
                <motion.li
                  key={tech}
                  variants={slideUpItem}
                  custom={i}
                  className="flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {tech}
                </motion.li>
              ))}
            </motion.ul>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" custom={3}>
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
              <motion.ul
                className="list-disc list-inside space-y-1 text-slate-700 text-sm"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } }}
              >
                {TEYVAT_CARD_TECH.core.map((tech, i) => (
                  <motion.li key={tech} variants={slideUpItem} custom={i}>{tech}</motion.li>
                ))}
              </motion.ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faRocket} className="text-fuchsia-500 text-sm" />
                Công cụ bổ sung
              </h4>
              <motion.ul
                className="list-disc list-inside space-y-1 text-slate-700 text-sm"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } }}
              >
                {TEYVAT_CARD_TECH.additional.map((tech, i) => (
                  <motion.li key={tech} variants={slideUpItem} custom={i}>{tech}</motion.li>
                ))}
              </motion.ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faPalette} className="text-fuchsia-500 text-sm" />
                Tính năng kỹ thuật
              </h4>
              <motion.ul
                className="list-disc list-inside space-y-1 text-slate-700 text-sm"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } } }}
              >
                {TEYVAT_CARD_TECH.highlights.map((item, i) => (
                  <motion.li key={item} variants={slideUpItem} custom={i}>{item}</motion.li>
                ))}
              </motion.ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" custom={4}>
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
            {EXTERNAL_SERVICES.map((service, i) => {
              const typed = service as ExternalService;

              if (typed.flipModel) {
                return <OllamaFlipCard key={service.name} service={typed} index={i} />;
              }

              // Mặc định cho các dịch vụ khác
              return (
                <motion.div
                  key={service.name}
                  initial="hidden"
                  animate="visible"
                  variants={slideUpItem}
                  custom={i}
                  whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                  className={`rounded-xl border ${service.borderColor} ${service.bgLight} p-4 transition-shadow hover:shadow-md`}
                >
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${service.gradient} text-white text-sm overflow-hidden`}
                    >
                      {service.logoUrl ? (
                        <img
                          src={service.logoUrl}
                          alt={service.name}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <FontAwesomeIcon icon={service.icon} />
                      )}
                    </span>
                    <span>{service.name}</span>
                    {service.logoLabel && (
                      <span className={`ml-1 inline-flex items-center rounded-full border-2 ${service.borderColor} bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm`}>
                        {service.logoLabel}
                      </span>
                    )}
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
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
