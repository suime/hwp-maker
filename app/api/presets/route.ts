import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * public/presets 디렉토리의 YAML 프리셋 목록을 반환합니다.
 */
export async function GET() {
  try {
    const presetsDir = path.join(process.cwd(), 'public', 'presets');

    if (!fs.existsSync(presetsDir)) {
      fs.mkdirSync(presetsDir, { recursive: true });
    }

    const presets = fs.readdirSync(presetsDir)
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map((file) => ({
        id: `builtin-preset-${file}`,
        name: file.replace(/\.(yaml|yml)$/i, ''),
        filePath: `/presets/${file}`,
      }));

    return NextResponse.json(presets);
  } catch (error) {
    console.error('프리셋 목록 로드 실패:', error);
    return NextResponse.json({ error: 'Failed to load presets' }, { status: 500 });
  }
}
