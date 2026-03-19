import mammoth from 'mammoth';
import * as XLSX from 'xlsx-js-style';

export interface ParsedDocument {
  fileName: string;
  content: string;
  method: 'client_docx' | 'client_xlsx' | 'client_csv' | 'client_txt' | 'client_pdf_text' | 'client_pptx' | 'needs_vision';
  sizeBytes: number;
  pagesOrSheets?: number;
  extractionQuality: 'high' | 'medium' | 'low' | 'failed';
  summary: string;
}

const MAX_CHARS_PER_FILE = 40_000;

// ═══════════════════════════════════════════════════════════════
// PDF — Extraction via PDF.js (robuste, gère les streams compressés)
// ═══════════════════════════════════════════════════════════════
async function parsePdf(file: File): Promise<{ text: string; pages: number } | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = '';
    
    const maxPages = Math.min(totalPages, 30);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      const items = content.items as any[];
      let pageText = '';
      let lastY = -1;
      
      for (const item of items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
        lastY = item.transform[5];
      }
      
      fullText += `\n--- Page ${i}/${totalPages} ---\n${pageText.trim()}\n`;
    }
    
    if (maxPages < totalPages) {
      fullText += `\n[... ${totalPages - maxPages} pages supplémentaires non lues]\n`;
    }
    
    const cleanText = fullText.replace(/\s+/g, ' ').trim();
    if (cleanText.length > 50) {
      return { text: fullText.substring(0, MAX_CHARS_PER_FILE), pages: totalPages };
    }
    
    return null;
    
  } catch (err) {
    console.warn('PDF.js parsing failed for', file.name, ':', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// DOCX — Extraction avec mammoth (texte + tableaux en HTML → texte structuré)
// ═══════════════════════════════════════════════════════════════
async function parseDocx(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = htmlResult.value;
    
    let text = html
      .replace(/<table[^>]*>/gi, '\n┌─── TABLEAU ───\n')
      .replace(/<\/table>/gi, '\n└─── FIN TABLEAU ───\n')
      .replace(/<tr[^>]*>/gi, '│ ')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<th[^>]*>(.*?)<\/th>/gi, '[$1] | ')
      .replace(/<td[^>]*>(.*?)<\/td>/gi, '$1 | ')
      .replace(/<li[^>]*>/gi, '  • ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n═══ $1 ═══\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n── $1 ──\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n─ $1 ─\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/  +/g, ' ')
      .trim();
    
    if (text.length < 50) {
      const rawResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      text = rawResult.value;
    }
    
    return text.substring(0, MAX_CHARS_PER_FILE);
  } catch (err) {
    console.warn('DOCX parsing failed for', file.name, ':', err);
    return `[Erreur de lecture du document Word: ${file.name}]`;
  }
}

// ═══════════════════════════════════════════════════════════════
// XLSX — Extraction structurée (préserve tableaux, détecte les données financières)
// ═══════════════════════════════════════════════════════════════
async function parseXlsx(file: File): Promise<{ text: string; sheets: number }> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
    let text = '';
    const sheetCount = workbook.SheetNames.length;
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet['!ref']) continue;
      
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const rows = range.e.r - range.s.r + 1;
      const cols = range.e.c - range.s.c + 1;
      
      text += `\n┌─── Feuille: "${sheetName}" (${rows} lignes × ${cols} colonnes) ───\n`;
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      
      for (let r = 0; r < Math.min(jsonData.length, 200); r++) {
        const row = jsonData[r];
        if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) continue;
        
        const cells = row.map((cell: any) => {
          if (cell === null || cell === undefined || cell === '') return '—';
          if (cell instanceof Date) return cell.toLocaleDateString('fr-FR');
          if (typeof cell === 'number') {
            if (Math.abs(cell) >= 1000) return new Intl.NumberFormat('fr-FR').format(cell);
            if (cell % 1 !== 0) return cell.toFixed(2);
            return cell.toString();
          }
          return String(cell).trim();
        });
        
        if (r === 0) {
          text += `│ [${cells.join('] | [')}]\n`;
          text += `│ ${'─'.repeat(60)}\n`;
        } else {
          text += `│ ${cells.join(' | ')}\n`;
        }
      }
      
      if (jsonData.length > 200) {
        text += `│ [... ${jsonData.length - 200} lignes supplémentaires non affichées]\n`;
      }
      
      text += `└─── Fin feuille "${sheetName}" ───\n`;
    }
    
    return { text: text.substring(0, MAX_CHARS_PER_FILE), sheets: sheetCount };
  } catch (err) {
    console.warn('XLSX parsing failed for', file.name, ':', err);
    return { text: `[Erreur de lecture Excel: ${file.name}]`, sheets: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// CSV/TSV — Extraction avec détection de séparateur
// ═══════════════════════════════════════════════════════════════
async function parseCsv(file: File): Promise<string> {
  try {
    const text = await file.text();
    
    const firstLine = text.split('\n')[0] || '';
    const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
    
    const lines = text.split('\n').filter(l => l.trim());
    let formatted = '';
    for (let i = 0; i < Math.min(lines.length, 500); i++) {
      const cells = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
      if (i === 0) {
        formatted += `[${cells.join('] | [')}]\n${'─'.repeat(60)}\n`;
      } else {
        formatted += `${cells.join(' | ')}\n`;
      }
    }
    
    return formatted.substring(0, MAX_CHARS_PER_FILE);
  } catch (err) {
    return `[Erreur de lecture CSV: ${file.name}]`;
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNCTION PRINCIPALE — Parse un fichier et retourne le résultat
// ═══════════════════════════════════════════════════════════════
export async function parseFile(file: File): Promise<ParsedDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const base = { fileName: file.name, sizeBytes: file.size };

  try {
    // ── PDF ──
    if (ext === 'pdf') {
      const result = await parsePdf(file);
      if (result && result.text.trim().length > 100) {
        const quality = result.text.length > 1000 ? 'high' : 'medium';
        return {
          ...base, content: result.text, method: 'client_pdf_text',
          pagesOrSheets: result.pages, extractionQuality: quality,
          summary: `PDF ${result.pages} pages — ${result.text.length} caractères extraits`
        };
      }
      return {
        ...base, content: '', method: 'needs_vision',
        extractionQuality: 'low',
        summary: `PDF scanné ou illisible — OCR Vision requis`
      };
    }

    // ── DOCX ──
    if (ext === 'docx' || ext === 'doc') {
      const content = await parseDocx(file);
      const quality = content.length > 500 ? 'high' : content.length > 100 ? 'medium' : 'low';
      return {
        ...base, content, method: 'client_docx',
        extractionQuality: quality,
        summary: `Word — ${content.length} caractères, ${content.includes('TABLEAU') ? 'contient des tableaux' : 'texte uniquement'}`
      };
    }

    // ── XLSX ──
    if (ext === 'xlsx' || ext === 'xls') {
      const result = await parseXlsx(file);
      const quality = result.text.length > 500 ? 'high' : result.text.length > 100 ? 'medium' : 'low';
      return {
        ...base, content: result.text, method: 'client_xlsx',
        pagesOrSheets: result.sheets, extractionQuality: quality,
        summary: `Excel ${result.sheets} feuilles — ${result.text.length} caractères extraits`
      };
    }

    // ── CSV/TSV ──
    if (ext === 'csv' || ext === 'tsv') {
      const content = await parseCsv(file);
      return {
        ...base, content, method: 'client_csv',
        extractionQuality: content.length > 100 ? 'high' : 'low',
        summary: `CSV — ${content.split('\n').length} lignes`
      };
    }

    // ── TXT/MD ──
    if (ext === 'txt' || ext === 'md') {
      const content = (await file.text()).substring(0, MAX_CHARS_PER_FILE);
      return {
        ...base, content, method: 'client_txt',
        extractionQuality: content.length > 50 ? 'high' : 'low',
        summary: `Texte — ${content.length} caractères`
      };
    }

    // ── Images ──
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext)) {
      return {
        ...base, content: '', method: 'needs_vision',
        extractionQuality: 'low',
        summary: `Image — OCR Vision requis`
      };
    }

    // ── PPTX ──
    if (ext === 'pptx' || ext === 'ppt') {
      return {
        ...base, content: '', method: 'needs_vision',
        extractionQuality: 'low',
        summary: `PowerPoint — OCR Vision requis`
      };
    }

    // ── Format non supporté ──
    return {
      ...base, content: `[Format non supporté: .${ext}]`, method: 'client_txt',
      extractionQuality: 'failed',
      summary: `Format .${ext} non supporté`
    };

  } catch (err) {
    console.error(`Erreur parsing ${file.name}:`, err);
    return {
      ...base, content: `[Erreur de lecture: ${file.name}]`, method: 'client_txt',
      extractionQuality: 'failed',
      summary: `Erreur: ${err instanceof Error ? err.message : 'inconnu'}`
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUIRE LE DOCUMENT CONTENT FINAL
// ═══════════════════════════════════════════════════════════════
export function buildDocumentContent(docs: ParsedDocument[]): string {
  const MAX_TOTAL = 150_000;
  let content = '';
  
  const sorted = [...docs].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2, failed: 3 };
    return (order[a.extractionQuality] || 3) - (order[b.extractionQuality] || 3);
  });

  for (const doc of sorted) {
    if (content.length >= MAX_TOTAL) break;
    if (!doc.content || doc.content.length < 10) continue;

    const header = `\n\n══════ ${doc.fileName} (${doc.method}) ══════\n`;
    const remaining = MAX_TOTAL - content.length - header.length;
    if (remaining <= 0) break;

    content += header + doc.content.substring(0, remaining);
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════
// FILE TO BASE64 (pour l'envoi au Vision)
// ═══════════════════════════════════════════════════════════════
export function fileToBase64(file: File, maxBytes = 5 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const slice = file.slice(0, maxBytes);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(slice);
  });
}
