import { useEffect, useMemo, useState } from 'react'
import ArticleCard from './components/ArticleCard.jsx'
import { fetchArticles } from './api.js'

export default function App() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

  async function load() {
    try {
      setLoading(true)
      setError('')
      const data = await fetchArticles({ apiBase, q, page, pageSize })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [q, page, pageSize])

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  return (
    <div className="container">
      <header>
        <h1>BeyondChats Articles</h1>
        <div className="controls">
          <input value={q} onChange={e=>{setPage(1); setQ(e.target.value)}} placeholder="Search..." />
          <select value={pageSize} onChange={e=>{setPage(1); setPageSize(Number(e.target.value))}}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>
        </div>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}

      <div className="grid">
        {items.map(a => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>

      <footer className="pager">
        <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <span>{page}/{pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>
      </footer>
    </div>
  )
}
