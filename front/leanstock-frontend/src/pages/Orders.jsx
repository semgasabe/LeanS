import { useEffect, useState, useCallback } from 'react'
import { Plus, ShoppingCart, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import api from '../api/client'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const STATUS_FLOW  = { PENDING:['APPROVED','CANCELLED'], APPROVED:['RECEIVED','CANCELLED'], RECEIVED:[], CANCELLED:[] }
const STATUS_COLOR = { PENDING:'amber', APPROVED:'blue', RECEIVED:'green', CANCELLED:'muted' }
const STATUS_LABEL = { PENDING:'Pending', APPROVED:'Approved', RECEIVED:'Received', CANCELLED:'Cancelled' }

export default function Orders() {
  const toast = useToast()
  const [orders, setOrders]     = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal]       = useState(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ locationId:'', supplier:'', items:[{ productId:'', quantity:1, unitPrice:'' }] })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ord, prod, loc] = await Promise.all([
        api.get('/orders', { params: { status: statusFilter || undefined, limit:50 } }),
        api.get('/products?limit=200'),
        api.get('/locations'),
      ])
      setOrders(ord.data.data || ord.data || [])
      setProducts(prod.data.data || prod.data || [])
      setLocations(loc.data.data || loc.data || [])
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function createOrder() {
    setSaving(true)
    try {
      await api.post('/orders', { locationId: form.locationId, supplier: form.supplier, items: form.items.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: parseFloat(i.unitPrice) })) })
      toast('Order created', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/orders/${id}/status`, { status })
      toast(`Status updated to "${STATUS_LABEL[status]}"`, 'success')
      load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
  }

  function addItem()          { setForm(f => ({ ...f, items:[...f.items,{ productId:'', quantity:1, unitPrice:'' }] })) }
  function removeItem(i)      { setForm(f => ({ ...f, items:f.items.filter((_,idx)=>idx!==i) })) }
  function updateItem(i,k,v)  { setForm(f => ({ ...f, items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it) })) }

  return (
    <div style={{ maxWidth:1000 }}>
      <div className="page-header">
        <div className="page-title-row">
          <h1>Purchase Orders</h1>
          <span className="page-subtitle">{orders.length} orders</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ locationId:'', supplier:'', items:[{ productId:'', quantity:1, unitPrice:'' }] }); setModal('create') }}>
          <Plus size={15} /> New order
        </button>
      </div>

      <div className="filter-bar">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth:200 }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th style={{ width:30 }}></th><th>ID</th><th>Supplier</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center' }}><span className="spinner" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><ShoppingCart size={40} /><span>No orders yet</span></div></td></tr>
              ) : orders.map(o => [
                <tr key={o.id} style={{ background: expanded===o.id ? 'var(--bg-hover)' : undefined }}>
                  <td><button className="btn btn-icon btn-ghost btn-sm" onClick={() => setExpanded(e => e===o.id ? null : o.id)}>{expanded===o.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button></td>
                  <td><span className="mono text-secondary" style={{ fontSize:12 }}>#{o.id?.slice(0,8)}</span></td>
                  <td><span style={{ fontWeight:500 }}>{o.supplier}</span></td>
                  <td><span className="text-secondary">{o.location?.name || '—'}</span></td>
                  <td><span className={`badge badge-${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td><span className="text-muted" style={{ fontSize:12 }}>{new Date(o.createdAt).toLocaleDateString()}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      {STATUS_FLOW[o.status]?.map(next => (
                        <button key={next} className="btn btn-ghost btn-sm" onClick={() => updateStatus(o.id, next)}>→ {STATUS_LABEL[next]}</button>
                      ))}
                    </div>
                  </td>
                </tr>,
                expanded===o.id && (
                  <tr key={`${o.id}-exp`} style={{ background:'var(--bg-base)' }}>
                    <td colSpan={7} style={{ padding:'0 12px 14px 48px' }}>
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:8 }}>Order items:</div>
                        {o.items?.length ? (
                          <table style={{ width:'auto' }}>
                            <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
                            <tbody>{o.items.map(i => (
                              <tr key={i.id}>
                                <td>{i.product?.name}</td>
                                <td><span className="mono">{i.quantity}</span></td>
                                <td><span className="mono">$ {Number(i.unitPrice).toLocaleString()}</span></td>
                                <td><span className="mono">$ {(i.quantity * Number(i.unitPrice)).toLocaleString()}</span></td>
                              </tr>
                            ))}</tbody>
                          </table>
                        ) : <span style={{ color:'var(--text-muted)', fontSize:12 }}>No items</span>}
                      </div>
                    </td>
                  </tr>
                )
              ])}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <Modal title="New purchase order" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={createOrder} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Create order'}</button></>}>
          <div className="form-row form-row-2">
            <div className="form-group"><label>Supplier</label><input value={form.supplier} onChange={e => setForm(f=>({...f,supplier:e.target.value}))} placeholder="Supplier name" /></div>
            <div className="form-group"><label>Location</label>
              <select value={form.locationId} onChange={e => setForm(f=>({...f,locationId:e.target.value}))}>
                <option value="">— Select —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <label style={{ margin:0 }}>Line items</label>
              <button className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={13} /> Add line</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {form.items.map((item,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px 32px', gap:8, alignItems:'center' }}>
                  <select value={item.productId} onChange={e => updateItem(i,'productId',e.target.value)}>
                    <option value="">— Product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i,'quantity',e.target.value)} />
                  <input type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(i,'unitPrice',e.target.value)} />
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeItem(i)} disabled={form.items.length===1}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
