import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const EMPTY = { name: '', sku: '', description: '', price: '' }

export default function Products() {
  const { user } = useAuth()
  const toast    = useToast()
  const canEdit  = ['ADMIN','MANAGER'].includes(user?.role)
  const [items, setItems]   = useState([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/products', { params: { page, limit: 15, search: search || undefined } })
      setItems(r.data.data || r.data || [])
      setTotal(r.data.total || 0)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY); setModal('create') }
  function openEdit(p)  { setSelected(p); setForm({ name: p.name, sku: p.sku, description: p.description || '', price: p.price }); setModal('edit') }
  function openDelete(p){ setSelected(p); setModal('delete') }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) }
      if (modal === 'create') await api.post('/products', payload)
      else await api.put(`/products/${selected.id}`, payload)
      toast(modal === 'create' ? 'Product created' : 'Product updated', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  async function del() {
    setSaving(true)
    try {
      await api.delete(`/products/${selected.id}`)
      toast('Product deleted', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div className="page-title-row">
          <h1>Products</h1>
          <span className="page-subtitle">{total} items in catalog</span>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add product</button>}
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ paddingLeft: 32 }} placeholder="Search by name, SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Description</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><Package size={40} /><span>No products found</span></div></td></tr>
              ) : items.map(p => (
                <tr key={p.id}>
                  <td><span style={{ fontWeight: 500 }}>{p.name}</span></td>
                  <td><span className="mono text-secondary">{p.sku}</span></td>
                  <td><span className="mono">$ {Number(p.price).toLocaleString()}</span></td>
                  <td><span className="text-secondary" style={{ fontSize: 12 }}>{p.description?.slice(0,50) || '—'}</span></td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit"><Edit2 size={13} /></button>
                        {user?.role === 'ADMIN' && <button className="btn btn-icon btn-danger btn-sm" onClick={() => openDelete(p)} title="Delete"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New product' : 'Edit product'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Save'}</button></>}>
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Product name" /></div>
          <div className="form-row form-row-2">
            <div className="form-group"><label>SKU</label><input value={form.sku} onChange={e => setForm(f=>({...f,sku:e.target.value}))} placeholder="PROD-001" /></div>
            <div className="form-group"><label>Price ($)</label><input type="number" step="0.01" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} placeholder="0.00" /></div>
          </div>
          <div className="form-group"><label>Description</label><textarea rows={3} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Optional description..." /></div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete product" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={del} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Delete'}</button></>}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{selected?.name}"</strong>?<br />This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
