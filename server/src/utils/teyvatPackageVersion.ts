/**
 * Đọc version từ TeyvatCard/package.json.
 * MAJOR: lấy từ file, user tăng thủ công khi cần.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEYVAT_PACKAGE_JSON =
  process.env.TEYVAT_PACKAGE_PATH ||
  path.resolve(__dirname, '..', '..', '..', 'TeyvatCard', 'package.json');

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

function parseSemver(version: string): ParsedVersion {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(version).trim());
  if (!match) {
    return { major: 1, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Lấy major từ TeyvatCard/package.json (version field).
 * @throws Error nếu không đọc được file
 */
export function getTeyvatPackageMajor(): number {
  const content = fs.readFileSync(TEYVAT_PACKAGE_JSON, 'utf-8');
  const pkg = JSON.parse(content) as { version?: string };
  const version = pkg.version ?? '1.0.0';
  const parsed = parseSemver(version);
  return parsed.major;
}
