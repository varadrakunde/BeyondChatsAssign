import dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { prisma } from './db.js';
import { prisma as _ignore } from './db.js';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const LIMIT = Number(process.env.PHASE2_LIMIT || 1);

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

async function googleSearch(title){
  const q = encodeURIComponent(title);
  const url = `https://www.google.com/search?q=${q}&hl=en`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const links = [];
  $('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.startsWith('/url?q=')){
      const u = new URL('https://www.google.com' + href);
      const target = u.searchParams.get('q');
      if (target && !/google\.|youtube\.|pdf$|\/pdf$/i.test(target) && !/beyondchats\.com/i.test(target)){
        links.push(target);
      }
    }
  });
  // Deduplicate and take first 2
  return [...new Set(links)].slice(0,2);
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
  return data.items || [];
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
  const items = await listLocalArticles();
  const targets = items.slice(0, LIMIT);
  for (const art of targets){
    console.log('Processing:', art.title);
    const links = await googleSearch(art.title);
    if (links.length === 0){ console.log('No links found, skipping'); continue; }
    const [l1, l2] = links;
    const [ref1, ref2] = await Promise.all([fetchArticleBody(l1), l2 ? fetchArticleBody(l2) : '']);

    const citations = [l1, l2].filter(Boolean);
    const llm = await llmRewrite({ title: art.title, original: art.content || art.summary || '', ref1, ref2, citations });

    let newSlug = normalizeSlug(llm.title || `${art.slug}-updated`);
    if (!newSlug || newSlug === art.slug) newSlug = `${art.slug}-updated-${Date.now()}`;
    const newUrl = `https://example.com/generated/${newSlug}`;

    const finalContent = `${llm.content}\n\nReferences:\n${citations.map(u=>`- ${u}`).join('\n')}`;
    const created = await publishArticle({
      title: llm.title || `Updated: ${art.title}`,
      slug: newSlug,
      url: newUrl,
      author: 'AI Assistant',
      summary: llm.summary || (finalContent.slice(0, 240)),
      content: finalContent
    });
    console.log('Published new article id:', created.id);
    await sleep(1500);
  }
  console.log('Phase 2 complete');
}

main().catch(e => { console.error(e); process.exit(1); });
