import { useState } from 'react'

export default function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false)
  const isUpdated = (
    (article?.author && /ai assistant/i.test(article.author)) ||
    /-updated/.test(article?.slug || '') ||
    /(\n|^)References:\n/.test(article?.content || '')
  )
  const published = article?.publishedAt ? new Date(article.publishedAt).toLocaleString() : '—'
  const preview = article.summary || (article.content ? article.content.slice(0, 180) + '…' : '')

  return (
    <article className="card">
      <div className="card-head" style={{ alignItems: 'center' }}>
        <h3 style={{ marginRight: 'auto' }}>{article.title}</h3>
        {isUpdated && <span className="badge" style={{ marginRight: 8 }}>Updated</span>}
        {isUpdated && (
          <button onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>
      <p className="muted">{published}</p>
      {!expanded && <p>{preview}</p>}
      {expanded && (
        <div className="expanded" style={{ marginTop: 8 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{article.content || preview}</pre>
        </div>
      )}
      <div className="links" style={{ marginTop: 8 }}>
        <a href={article.url} target="_blank" rel="noreferrer">Original link</a>
      </div>
    </article>
  )
}
