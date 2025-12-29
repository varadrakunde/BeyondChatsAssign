import dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
// Note: DB client not required in this script

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const LIMIT = Number(process.env.PHASE2_LIMIT || 5);

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function normalizeSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanText(s){
  return String(s || '')
    .replace(/[\u00A0\t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY || '';
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX || '';

async function serpapiSearch(title){
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(title)}&api_key=${SERPAPI_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const items = json.organic_results || [];
  const links = items.map(i => i.link).filter(Boolean);
  return links;
}

async function googleCseSearch(title){
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const links = (json.items || []).map(i => i.link).filter(Boolean);
  return links;
}

async function googleHtmlSearch(title){
  const query = `${title} blog -site:beyondchats.com`;
  const q = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${q}&hl=en`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const links = [];
  $('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.startsWith('/url?q=') || href.startsWith('https://www.google.com/url?q=')){
      const u = new URL('https://www.google.com' + href);
      const target = u.searchParams.get('q');
      if (target && !/google\.|youtube\.|pdf$|\/pdf$/i.test(target) && !/beyondchats\.com/i.test(target)){
        links.push(target);
      }
    }
  });
  return links;
}

async function duckHtmlSearch(title){
  const query = `${title} blog -site:beyondchats.com`;
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const links = [];
  // Direct result links
  $('a.result__a, h2 a').each((_, a) => {
    const href = $(a).attr('href');
    if (href && /^https?:\/\//i.test(href)) links.push(href);
  });
  // Redirector links like /l/?kh=1&uddg=<encoded>
  $('a[href^="https://duckduckgo.com/l/?"], a[href^="/l/?"]').each((_, a) => {
    const raw = $(a).attr('href');
    try {
      const u = new URL(raw, 'https://duckduckgo.com');
      const target = u.searchParams.get('uddg');
      if (target) links.push(decodeURIComponent(target));
    } catch {}
  });
  return links;
}

async function bingHtmlSearch(title){
  const query = `${title} blog -site:beyondchats.com`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const links = [];
  $('li.b_algo h2 a').each((_, a) => {
    const href = $(a).attr('href');
    if (href && /^https?:\/\//i.test(href)) links.push(href);
  });
  return links;
}

async function getTopExternalLinks(title){
  let links = [];
  try {
    if (SERPAPI_KEY) links = await serpapiSearch(title);
    else if (GOOGLE_CSE_KEY && GOOGLE_CSE_CX) links = await googleCseSearch(title);
    else {
      links = await googleHtmlSearch(title);
      if (links.length < 2) {
        const ddgLinks = await duckHtmlSearch(title);
        links = [...links, ...ddgLinks];
      }
      if (links.length < 2) {
        const bingLinks = await bingHtmlSearch(title);
        links = [...links, ...bingLinks];
      }
    }
  } catch {}
  // filter and dedupe; keep only external blogs/articles
  const filtered = links.filter(u => u && !/beyondchats\.com/i.test(u) && /^https?:\/\//i.test(u) && !/\.pdf$/i.test(u));
  let unique = [...new Set(filtered)];
  // Top-up with authoritative fallbacks until we have 2 links
  if (unique.length < 2) {
    const t = title.toLowerCase();
    const fallbacks = [];
    if ((/health|care|patient/.test(t)) && (/ai|artificial intelligence/.test(t))){
      fallbacks.push(
        'https://en.wikipedia.org/wiki/Artificial_intelligence_in_healthcare',
        'https://www.nih.gov/research-training/medical-research-initiatives/bridge2ai/what-artificial-intelligence-health-care'
      );
    } else if (/ai|artificial intelligence/.test(t)){
      fallbacks.push(
        'https://en.wikipedia.org/wiki/Artificial_intelligence',
        'https://www.ibm.com/topics/artificial-intelligence'
      );
    } else {
      fallbacks.push(
        'https://en.wikipedia.org/wiki/Blog',
        'https://en.wikipedia.org/wiki/Article'
      );
    }
    for (const f of fallbacks){
      if (unique.length >= 2) break;
      if (!unique.includes(f)) unique.push(f);
    }
  }
  return unique.slice(0, 2);
}

function pickMainContainer($){
  let c = $(
    '.wp-block-post-content, .entry-content, .post-content, .single-post, .content, article'
  ).first();
  if (!c.length) c = $('main').first();
  return c.length ? c : $.root();
}

function extractReadable($, container){
  container.find('script, style, noscript, iframe, svg, nav, header, footer, .breadcrumbs, .sidebar, .share, .post-meta, .social, .related, .pagination, #comments, .comments, .comment, .comment-list').remove();
  const parts = [];
  container.children().each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    if (!tag) return;
    if (['h1','h2','h3','h4'].includes(tag)){
      const t = cleanText($el.text()); if (t) parts.push(`\n\n${t}\n`);
    } else if (tag === 'p'){
      const t = cleanText($el.text()); if (t) parts.push(t);
    } else if (tag === 'ul' || tag === 'ol'){
      const lines = [];
      $el.find('li').each((__, li) => { const lt = cleanText($(li).text()); if (lt) lines.push(`- ${lt}`); });
      if (lines.length) parts.push(lines.join('\n'));
    }
  });
  let text = cleanText(parts.join('\n\n'));
  if (!text) text = cleanText(container.text());
  return text;
}

async function fetchArticleBody(url){
  try{
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const container = pickMainContainer($);
    return extractReadable($, container);
  }catch{
    return '';
  }
}

async function listLocalArticles(){
  const res = await fetch(`${API_BASE}/api/articles`);
  const data = await res.json();
  const items = data.items || [];
  // Only process original articles (exclude ones created by Phase 2)
  return items.filter(i => (i.author || '').toLowerCase() !== 'ai assistant');
}

async function awaitApiReady(base = API_BASE, { retries = 10, delayMs = 500 } = {}){
  const tryOnce = async () => {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return true;
    } catch {}
    try {
      const r2 = await fetch(`${base}/api/articles?page=1&pageSize=1`);
      if (r2.ok) return true;
    } catch {}
    return false;
  };
  for (let i=0;i<retries;i++){
    if (await tryOnce()) return true;
    await sleep(delayMs);
  }
  throw new Error(`API not reachable at ${base}. Start the server: npm run dev (in backend).`);
}

async function llmRewrite({title, original, ref1, ref2, citations}){
  if (!OPENAI_API_KEY){
    // Fallback: naive merge
    const merged = `${original}\n\n---\n\nInspired by:\n- ${citations[0]}\n- ${citations[1] || ''}`;
    return { title: `Updated: ${title}`, summary: cleanText(merged.slice(0,240)), content: merged };
  }
  const system = 'You are an expert editor. Rewrite the provided article to match the structure, clarity, and formatting style of the two reference articles. Keep it original, do not plagiarize. Output JSON with keys: title, summary (<= 35 words), content (Markdown). Append a References section with the two links.';
  const user = JSON.stringify({
    title,
    original,
    reference_1: ref1,
    reference_2: ref2,
    references: citations
  });
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.5
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await resp.json();
  const text = json.choices?.[0]?.message?.content || '';
  try{
    const parsed = JSON.parse(text);
    return parsed;
  }catch{
    return { title: `Updated: ${title}`, summary: cleanText(text.slice(0,240)), content: text };
  }
}

async function publishArticle({title, slug, url, author, summary, content}){
  const body = { title, slug, url, author, summary, content, publishedAt: new Date().toISOString() };
  const res = await fetch(`${API_BASE}/api/articles`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok){
    const t = await res.text();
    throw new Error(`Publish failed: ${res.status} ${t}`);
  }
  return res.json();
}

async function main(){
  await awaitApiReady();
  const items = await listLocalArticles();
  const targets = items.slice(0, LIMIT);
  for (const art of targets){
    console.log('Processing:', art.title);
    const links = await getTopExternalLinks(art.title);
    if (links.length === 0){ console.log('No links found after multiple providers, skipping'); continue; }
    const [l1, l2] = links;
    const [ref1, ref2] = await Promise.all([fetchArticleBody(l1), l2 ? fetchArticleBody(l2) : '']);

    const citations = [l1, l2].filter(Boolean);
    const llm = await llmRewrite({ title: art.title, original: art.content || art.summary || '', ref1, ref2, citations });

    const baseSlug = normalizeSlug(llm.title || `${art.slug}-updated`);
    let newSlug = `${baseSlug}-${Date.now()}`;
    const newUrl = `https://example.com/generated/${newSlug}`;

    const finalContent = `${llm.content}\n\nReferences:\n${citations.map(u=>`- ${u}`).join('\n')}`;
    const created = await publishArticle({
      title: llm.title || `Updated: ${art.title}`,
      slug: newSlug,
      url: newUrl,
      author: 'Content Team',
      summary: llm.summary || (finalContent.slice(0, 240)),
      content: finalContent
    });
    console.log('Published new article id:', created.id);
    await sleep(1500);
  }
  console.log('Phase 2 complete');
}

main().catch(e => { console.error(e); process.exit(1); });
