import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const repoRoot = path.resolve(process.cwd(), '..');
const pdfPath = path.join(repoRoot, 'docs', 'Assignment.pdf');
const outPath = path.join(repoRoot, 'docs', 'PHASE1.txt');

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(result => {
  const text = result.text.replace(/\r/g, '');
  const lower = text.toLowerCase();
  const p1 = lower.indexOf('phase 1');
  const next = lower.indexOf('phase 2');
  let segment = '';
  if (p1 >= 0) {
    segment = text.substring(p1, next > p1 ? next : Math.min(text.length, p1 + 2000));
  } else {
    // Fallback: first ~1500 chars to surface initial section
    segment = text.substring(0, Math.min(text.length, 1500));
  }
  fs.writeFileSync(outPath, segment, 'utf8');
  console.log('Wrote Phase 1 excerpt to', outPath);
  console.log('--- BEGIN EXCERPT ---');
  console.log(segment);
  console.log('--- END EXCERPT ---');
}).catch(err => {
  console.error('Failed to parse PDF:', err.message);
  process.exit(1);
});
