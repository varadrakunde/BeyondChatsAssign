export async function fetchArticles({ apiBase, q='', page=1, pageSize=10 }) {
  const url = new URL(apiBase + '/api/articles')
  if (q) url.searchParams.set('q', q)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch articles')
  return res.json()
}
