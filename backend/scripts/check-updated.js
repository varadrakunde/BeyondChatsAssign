import { prisma } from '../src/db.js';

const run = async () => {
  const total = await prisma.article.count();
  const updatedByAuthor = await prisma.article.count({ where: { author: 'AI Assistant' } });
  const updatedBySlug = await prisma.article.count({ where: { slug: { contains: '-updated' } } });
  console.log(JSON.stringify({ total, updatedByAuthor, updatedBySlug }, null, 2));
  await prisma.$disconnect();
};
run().catch(e => { console.error(e); process.exit(1); });
