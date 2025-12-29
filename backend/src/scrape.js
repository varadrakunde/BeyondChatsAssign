import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { prisma } from './db.js';

const BASE = 'https://beyondchats.com/blogs/';

async function getLastPageNumber() {
  const res = await fetch(BASE);
  const html = await res.text();
  const $ = cheerio.load(html);
  let max = 1;
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/\bpage=(\d+)/i);
    if (m) {
      const n = Number(m[1]);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  });
  return max;
}

function normalizeSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function scrapePage(page) {
  const url = page > 1 ? `${BASE}?page=${page}` : BASE;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  const articles = [];

  // Heuristic selectors; adjust if DOM differs
  $('.blog-card, article, .post, .card').each((_, el) => {
    const title = $(el).find('h2, .title, h3').first().text().trim();
    const link = $(el).find('a').first().attr('href');
    const urlAbs = link?.startsWith('http') ? link : (link ? new URL(link, BASE).href : null);
    const summary = $(el).find('p, .summary, .excerpt').first().text().trim();
    let dateText = $(el).find('time').attr('datetime') || $(el).find('time, .date').first().text().trim();
    let publishedAt = null;
    try { if (dateText) publishedAt = new Date(dateText); } catch {}

    if (title && urlAbs) {
      articles.push({ title, url: urlAbs, summary, publishedAt });
    }
  });

  // Fallback: list items
  if (articles.length === 0) {
    $('li a').each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      const urlAbs = link?.startsWith('http') ? link : (link ? new URL(link, BASE).href : null);
      if (title && urlAbs) articles.push({ title, url: urlAbs });
    });
  }

  return articles;
}

async function fetchArticleContent(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const content = $('article').text().trim() || $('.post-content, .content, .article').text().trim();
    const author = $('meta[name="author"]').attr('content') || $('.author, .post-author').first().text().trim() || null;
    let publishedAt = $('time').attr('datetime') || $('time, .date').first().text().trim();
    try { if (publishedAt) publishedAt = new Date(publishedAt); } catch { publishedAt = null; }
    return { content, author, publishedAt: publishedAt || null };
  } catch {
    return { content: null, author: null, publishedAt: null };
  }
}

async function main() {
  const last = await getLastPageNumber();
  const pageArticles = await scrapePage(last);
  // Oldest are on the last page; choose 5 oldest by publishedAt asc fallback by title
  const sorted = pageArticles.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.title).localeCompare(String(b.title));
  });
  const selected = sorted.slice(0, 5);

  for (const art of selected) {
    const { content, author, publishedAt } = await fetchArticleContent(art.url);
    const slug = normalizeSlug(art.title);
    try {
      await prisma.article.upsert({
        where: { url: art.url },
        update: { title: art.title, slug, summary: art.summary || null, content, author, publishedAt },
        create: { title: art.title, slug, url: art.url, summary: art.summary || null, content, author, publishedAt }
      });
      console.log('Saved:', art.title);
    } catch (e) {
      console.error('Failed to save', art.url, e.message);
    }
  }

  console.log('Done.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
