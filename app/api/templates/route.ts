import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractTemplatePreviewBytes } from '@/lib/templates/preview';

/**
 * public/templates 디렉토리의 파일 목록을 반환합니다.
 */
export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'public', 'templates');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const files = fs.readdirSync(templatesDir);
    
    const templateFiles = files
      .filter(file => file.endsWith('.hwp') || file.endsWith('.hwpx'))
    
    const templates = await Promise.all(templateFiles.map(async (file) => {
        const name = file.replace(/\.(hwp|hwpx)$/i, '');
        const fileBuffer = fs.readFileSync(path.join(templatesDir, file));
        const previewBytes = await extractTemplatePreviewBytes(fileBuffer);
        const previewUrl = previewBytes
          ? `data:image/png;base64,${Buffer.from(previewBytes).toString('base64')}`
          : undefined;

        return {
          id: `builtin-${file}`,
          name,
          description: `${file.endsWith('.hwp') ? 'hwp' : 'hwpx'} 양식 파일`,
          builtIn: true,
          filePath: `/templates/${file}`,
          previewUrl,
        };
      }));

    return NextResponse.json(templates);
  } catch (error) {
    console.error('템플릿 목록 로드 실패:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}
