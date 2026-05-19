import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowLeftRight, Search, ChevronDown, ChevronRight, Boxes } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const MOVE_TYPES  = ['IN','SALE','ADJUSTMENT','DAMAGE','TRANSFER_IN','TRANSFER_OUT']
const MOVE_LABELS = { IN:'Inbound', SALE:'Sale', ADJUSTMENT:'Adjustment', DAMAGE:'Write-off', TRANSFER_IN:'Transfer In', TRANSFER_OUT:'Transfer Out' }
const TYPE_COLOR  = { IN:'green', SALE:'red', ADJUSTMENT:'blue', DAMAGE:'red', TRANSFER_IN:'green', TRANSFER_OUT:'amber' }

export default function Inventory() {
  const { user } = useAuth()
  const toast    = useToast()
  const canEdit  = ['ADMIN','MANAGER'].includes(user?.role)
  const [items, setItems]       = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [locFilter, setLocFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [movements, setMovements] = useState({})
  const [modal, setModal]       = useState(null)
  const [saving, setSaving]     = useState(false)
  const [createForm, setCreateForm] = useState({ productId:'', locationId:'', quantity:0, minQuantity:10 })
  const [moveForm, setMoveForm]     = useState({ type:'IN', quantity:1, note:'' })
  const [transferForm, setTransferForm] = useState({ fromInventoryId:'', toLocationId:'', quantity:1, note:'' })
  const [activeItem, setActiveItem] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, prod, loc] = await Promise.all([
        api.get('/inventory', { params: { limit:200, locationId: locFilter || undefined } }),
        api.get('/products?limit=200'),
        api.get('/locations'),
      ])
      setItems(inv.data.data || inv.data || [])
      setProducts(prod.data.data || prod.data || [])
      setLocations(loc.data.data || loc.data || [])
    } finally { setLoading(false) }
  }, [locFilter])

  useEffect(() => { load() }, [load])

  async function loadMovements(id) {
    if (movements[id]) return
    const r = await api.get(`/inventory/${id}/movements`)
    setMovements(m => ({ ...m, [id]: r.data.data || r.data || [] }))
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id); loadMovements(id)
  }

  async function createInv() {
    setSaving(true)
    try {
      await api.post('/inventory', createForm)
      toast('Inventory record created', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  async function recordMove() {
    setSaving(true)
    try {
      await api.post(`/inventory/${activeItem.id}/movements`, { ...moveForm, quantity: Number(moveForm.quantity) })
      toast('Movement recorded', 'success')
      setModal(null)
      setMovements(m => { const c={...m}; delete c[activeItem.id]; return c })
      load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  async function doTransfer() {
    setSaving(true)
    try {
      await api.post('/inventory/transfer', { fromInventoryId: transferForm.fromInventoryId, toLocationId: transferForm.toLocationId, quantity: Number(transferForm.quantity), note: transferForm.note })
      toast('Transfer completed', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const filtered = items.filter(i => { const q=search.toLowerCase(); return !q || i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q) })

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div className="page-title-row">
          <h1>Inventory</h1>
          <span className="page-subtitle">{filtered.length} records</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {canEdit && <>
            <button className="btn btn-ghost" onClick={() => { setTransferForm({ fromInventoryId:'', toLocationId:'', quantity:1, note:'' }); setModal('transfer') }}><ArrowLeftRight size={15} /> Transfer</button>
            <button className="btn btn-primary" onClick={() => { setCreateForm({ productId:'', locationId:'', quantity:0, minQuantity:10 }); setModal('create') }}><Plus size={15} /> Add record</button>
          </>}
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position:'relative', flex:1, maxWidth:280 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input style={{ paddingLeft:32 }} placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{ maxWidth:200 }}>
          <option value="">All locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th style={{ width:30 }}></th><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th><th>Min</th><th>Days</th><th>Discount</th>{canEdit && <th>Movement</th>}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding:40, textAlign:'center' }}><span className="spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><Boxes size={40} /><span>Inventory is empty</span></div></td></tr>
              ) : filtered.map(item => {
                const low  = item.quantity <= item.minQuantity
                const dead = item.daysInInventory >= 60
                const isExp = expanded === item.id
                return [
                  <tr key={item.id} style={{ background: isExp ? 'var(--bg-hover)' : undefined }}>
                    <td><button className="btn btn-icon btn-ghost btn-sm" onClick={() => toggleExpand(item.id)}>{isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontWeight:500 }}>{item.product?.name}</span>
                        {dead && <span className="badge badge-purple" style={{ fontSize:10 }}>Dead</span>}
                      </div>
                    </td>
                    <td><span className="mono text-secondary">{item.product?.sku}</span></td>
                    <td><span className="text-secondary">{item.location?.name}</span></td>
                    <td><span className={`mono ${low ? 'text-red' : 'text-green'}`} style={{ fontWeight:600 }}>{item.quantity}</span></td>
                    <td><span className="mono text-muted">{item.minQuantity}</span></td>
                    <td><span className={`mono ${dead ? 'text-purple' : 'text-muted'}`}>{item.daysInInventory}</span></td>
                    <td>{item.discountPct > 0 ? <span className="badge badge-amber">{item.discountPct}%</span> : <span className="text-muted">—</span>}</td>
                    {canEdit && <td><button className="btn btn-ghost btn-sm" onClick={() => { setActiveItem(item); setMoveForm({ type:'IN', quantity:1, note:'' }); setModal('move') }}>+ Movement</button></td>}
                  </tr>,
                  isExp && (
                    <tr key={`${item.id}-exp`} style={{ background:'var(--bg-base)' }}>
                      <td colSpan={9} style={{ padding:'0 12px 12px 48px' }}>
                        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6, marginTop:8 }}>Movement history:</div>
                        {!movements[item.id] ? <span className="spinner" style={{ width:14, height:14, display:'inline-block' }} />
                        : movements[item.id].length === 0 ? <span style={{ color:'var(--text-muted)', fontSize:12 }}>No records</span>
                        : (
                          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:200, overflowY:'auto' }}>
                            {movements[item.id].map(m => (
                              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'5px 10px', background:'var(--bg-surface)', borderRadius:4, border:'1px solid var(--border-dim)' }}>
                                <span className={`badge badge-${TYPE_COLOR[m.type]}`} style={{ fontSize:10 }}>{MOVE_LABELS[m.type]}</span>
                                <span className="mono" style={{ fontSize:12 }}>{['SALE','DAMAGE','TRANSFER_OUT'].includes(m.type) ? '-' : '+'}{m.quantity}</span>
                                <span style={{ color:'var(--text-muted)', fontSize:11 }}>{m.note || ''}</span>
                                <span style={{ color:'var(--text-muted)', fontSize:11, marginLeft:'auto' }}>{new Date(m.createdAt).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <Modal title="New inventory record" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={createInv} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Create'}</button></>}>
          <div className="form-group"><label>Product</label>
            <select value={createForm.productId} onChange={e => setCreateForm(f=>({...f,productId:e.target.value}))}>
              <option value="">— Select product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select></div>
          <div className="form-group"><label>Location</label>
            <select value={createForm.locationId} onChange={e => setCreateForm(f=>({...f,locationId:e.target.value}))}>
              <option value="">— Select location —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
          <div className="form-row form-row-2">
            <div className="form-group"><label>Quantity</label><input type="number" min="0" value={createForm.quantity} onChange={e => setCreateForm(f=>({...f,quantity:Number(e.target.value)}))} /></div>
            <div className="form-group"><label>Minimum</label><input type="number" min="0" value={createForm.minQuantity} onChange={e => setCreateForm(f=>({...f,minQuantity:Number(e.target.value)}))} /></div>
          </div>
        </Modal>
      )}

      {modal === 'move' && (
        <Modal title={`Record movement: ${activeItem?.product?.name}`} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={recordMove} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Save'}</button></>}>
          <div className="alert alert-info">Current stock: <strong>{activeItem?.quantity}</strong> units</div>
          <div className="form-group"><label>Type</label>
            <select value={moveForm.type} onChange={e => setMoveForm(f=>({...f,type:e.target.value}))}>
              {MOVE_TYPES.map(t => <option key={t} value={t}>{MOVE_LABELS[t]}</option>)}
            </select></div>
          <div className="form-group"><label>Quantity</label><input type="number" min="1" value={moveForm.quantity} onChange={e => setMoveForm(f=>({...f,quantity:e.target.value}))} /></div>
          <div className="form-group"><label>Note</label><input value={moveForm.note} onChange={e => setMoveForm(f=>({...f,note:e.target.value}))} placeholder="Optional..." /></div>
        </Modal>
      )}

      {modal === 'transfer' && (
        <Modal title="Transfer stock" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={doTransfer} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Transfer'}</button></>}>
          <div className="form-group"><label>From (inventory record)</label>
            <select value={transferForm.fromInventoryId} onChange={e => setTransferForm(f=>({...f,fromInventoryId:e.target.value}))}>
              <option value="">— Select source —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.product?.name} @ {i.location?.name} ({i.quantity} units)</option>)}
            </select></div>
          <div className="form-group"><label>To (location)</label>
            <select value={transferForm.toLocationId} onChange={e => setTransferForm(f=>({...f,toLocationId:e.target.value}))}>
              <option value="">— Select destination —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
          <div className="form-group"><label>Quantity</label><input type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm(f=>({...f,quantity:e.target.value}))} /></div>
          <div className="form-group"><label>Note</label><input value={transferForm.note} onChange={e => setTransferForm(f=>({...f,note:e.target.value}))} placeholder="Reason for transfer..." /></div>
        </Modal>
      )}
    </div>
  )
}
