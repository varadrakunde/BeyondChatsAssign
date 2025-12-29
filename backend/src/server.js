import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { prisma } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/echo', (req, res) => {
  res.json({ received: req.body });
});

// CRUD APIs for articles
app.get('/api/articles', async (req, res) => {
  const { q, page = 1, pageSize = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);
  const where = q
    ? { OR: [ { title: { contains: q } }, { summary: { contains: q } }, { content: { contains: q } } ] }
    : {};
  try {
    const [items, total] = await Promise.all([
      prisma.article.findMany({ where, skip, take, orderBy: { publishedAt: 'asc' } }),
      prisma.article.count({ where })
    ]);
    res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  const id = String(req.params.id);
  try {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/articles', async (req, res) => {
  const { title, slug, url, author, summary, content, publishedAt } = req.body;
  try {
    const article = await prisma.article.create({
      data: { title, slug, url, author, summary, content, publishedAt: publishedAt ? new Date(publishedAt) : null }
    });
    res.status(201).json(article);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/articles/:id', async (req, res) => {
  const id = String(req.params.id);
  const { title, slug, url, author, summary, content, publishedAt } = req.body;
  try {
    const article = await prisma.article.update({
      where: { id },
      data: { title, slug, url, author, summary, content, publishedAt: publishedAt ? new Date(publishedAt) : null }
    });
    res.json(article);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/articles/:id', async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.article.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
