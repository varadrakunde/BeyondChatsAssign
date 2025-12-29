export default function ArticleCard({ article }) {
  const isUpdated = article?.author === 'AI Assistant' || /-updated/.test(article?.slug || '')
  const published = article?.publishedAt ? new Date(article.publishedAt).toLocaleString() : '—'
  return (
    <article className="card">
      <div className="card-head">
        <h3>{article.title}</h3>
        {isUpdated && <span className="badge">Updated</span>}
      </div>
      <p className="muted">{published}</p>
      <p>{article.summary || (article.content ? article.content.slice(0, 180) + '…' : '')}</p>
      <div className="links">
        <a href={article.url} target="_blank" rel="noreferrer">Original link</a>
      </div>
    </article>
  )
}
