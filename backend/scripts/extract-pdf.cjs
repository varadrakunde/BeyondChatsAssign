const fs = require('fs');
const path = require('path');
const pdfMod = require('pdf-parse');

const repoRoot = path.resolve(process.cwd(), '..');
const pdfPath = path.join(repoRoot, 'docs', 'Assignment.pdf');
const outPath = path.join(repoRoot, 'docs', 'PHASE1.txt');

const dataBuffer = fs.readFileSync(pdfPath);

let pdfFn = null;
if (typeof pdfMod === 'function') pdfFn = pdfMod;
else if (pdfMod && typeof pdfMod.default === 'function') pdfFn = pdfMod.default;
else if (pdfMod && typeof pdfMod.parse === 'function') pdfFn = pdfMod.parse;

if (!pdfFn) {
  console.error('Failed to locate pdf parse function. Module shape:', Object.keys(pdfMod || {}));
  process.exit(1);
}

pdfFn(dataBuffer).then(result => {
  const text = result.text.replace(/\r/g, '');
  const lower = text.toLowerCase();
  const p1 = lower.indexOf('phase 1');
  const next = lower.indexOf('phase 2');
  let segment = '';
  if (p1 >= 0) {
    segment = text.substring(p1, next > p1 ? next : Math.min(text.length, p1 + 2000));
  } else {
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
