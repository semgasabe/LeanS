import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const EMPTY = { name:'', address:'' }

export default function Locations() {
  const { user } = useAuth()
  const toast    = useToast()
  const isAdmin  = user?.role === 'ADMIN'
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/locations'); setItems(r.data.data || r.data || []) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate()  { setForm(EMPTY); setModal('create') }
  function openEdit(l)   { setSelected(l); setForm({ name:l.name, address:l.address }); setModal('edit') }
  function openDelete(l) { setSelected(l); setModal('delete') }

  async function save() {
    setSaving(true)
    try {
      if (modal === 'create') await api.post('/locations', form)
      else await api.put(`/locations/${selected.id}`, form)
      toast(modal === 'create' ? 'Location created' : 'Location updated', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  async function del() {
    setSaving(true)
    try {
      await api.delete(`/locations/${selected.id}`)
      toast('Location deleted', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth:800 }}>
      <div className="page-header">
        <div className="page-title-row">
          <h1>Locations</h1>
          <span className="page-subtitle">{items.length} warehouses / stores</span>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add location</button>}
      </div>

      {loading ? <div className="loading-center"><span className="spinner" /></div>
      : items.length === 0 ? <div className="card"><div className="empty-state"><MapPin size={40} /><span>No locations yet</span></div></div>
      : (
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {items.map(l => (
            <div key={l.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
              <div style={{ display:'flex', gap:12, flex:1 }}>
                <div style={{ width:40, height:40, borderRadius:8, flexShrink:0, background:'var(--bg-elevated)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MapPin size={18} color="var(--amber)" />
                </div>
                <div>
                  <div style={{ fontWeight:600, marginBottom:2 }}>{l.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{l.address}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, fontFamily:'var(--font-mono)' }}>{l.id?.slice(0,12)}...</div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEdit(l)}><Edit2 size={13} /></button>
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => openDelete(l)}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New location' : 'Edit location'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Save'}</button></>}>
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Warehouse #1 / Store Almaty" /></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder="123 Main St, City" /></div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete location" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={del} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Delete'}</button></>}>
          <p style={{ color:'var(--text-secondary)' }}>
            Delete location <strong style={{ color:'var(--text-primary)' }}>"{selected?.name}"</strong>?<br />
            <span style={{ color:'var(--red)', fontSize:12 }}>This will also remove all inventory records at this location.</span>
          </p>
        </Modal>
      )}
    </div>
  )
}
