import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractTemplatePreviewBytes } from '@/lib/templates/preview';

type TemplateFile = {
  file: string;
  relativePath: string;
  folder: string;
};

const DEFAULT_TEMPLATE_FOLDER = '기본';

function isTemplateFile(file: string) {
  return file.endsWith('.hwp') || file.endsWith('.hwpx');
}

function toPublicTemplatePath(relativePath: string) {
  return `/templates/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

function collectTemplateFiles(dir: string, baseDir = dir): TemplateFile[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: TemplateFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTemplateFiles(fullPath, baseDir));
      continue;
    }

    if (!entry.isFile() || !isTemplateFile(entry.name)) continue;

    const relativePath = path.relative(baseDir, fullPath);
    const folderPath = path.dirname(relativePath);
    files.push({
      file: entry.name,
      relativePath,
      folder: folderPath === '.' ? DEFAULT_TEMPLATE_FOLDER : folderPath.split(path.sep).join(' / '),
    });
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'ko'));
}

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

    const templateFiles = collectTemplateFiles(templatesDir);
    
    const templates = await Promise.all(templateFiles.map(async ({ file, relativePath, folder }) => {
        const name = file.replace(/\.(hwp|hwpx)$/i, '');
        const fileBuffer = fs.readFileSync(path.join(templatesDir, relativePath));
        const previewBytes = await extractTemplatePreviewBytes(fileBuffer);
        const previewUrl = previewBytes
          ? `data:image/png;base64,${Buffer.from(previewBytes).toString('base64')}`
          : undefined;

        return {
          id: `builtin-${relativePath}`,
          name,
          description: `${file.endsWith('.hwp') ? 'hwp' : 'hwpx'} 양식 파일`,
          builtIn: true,
          folder,
          filePath: toPublicTemplatePath(relativePath),
          previewUrl,
        };
      }));

    return NextResponse.json(templates);
  } catch (error) {
    console.error('템플릿 목록 로드 실패:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}
