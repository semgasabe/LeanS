import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, Boxes, ShoppingCart, MapPin, AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{payload[0]?.value}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/inventory?limit=100'),
      api.get('/products?limit=100'),
      api.get('/locations'),
      ['ADMIN','MANAGER'].includes(user?.role) ? api.get('/orders?limit=10') : Promise.resolve({ data: { data: [] } }),
    ]).then(([inv, prod, loc, ord]) => {
      const items    = inv.data.data || inv.data || []
      const products = prod.data.data || prod.data || []
      const locations= loc.data.data || loc.data || []
      const ordList  = ord.data.data || ord.data || []
      setStats({
        products: products.length,
        locations: locations.length,
        totalQty: items.reduce((s, i) => s + i.quantity, 0),
        lowStock: items.filter(i => i.quantity <= i.minQuantity).length,
        deadStock: items.filter(i => i.daysInInventory >= 60).length,
      })
      setInventory(items.slice(0, 8))
      setOrders(ordList.slice(0, 5))
    }).catch(console.error).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="loading-center"><span className="spinner" /></div>

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const chartData = inventory.map(i => ({ name: i.product?.name?.slice(0, 10) || 'Item', qty: i.quantity, low: i.quantity <= i.minQuantity }))
  const statusColor = { PENDING:'amber', APPROVED:'blue', RECEIVED:'green', CANCELLED:'muted' }
  const statusLabel = { PENDING:'Pending', APPROVED:'Approved', RECEIVED:'Received', CANCELLED:'Cancelled' }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h1>{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>Warehouse overview</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="stat-card amber">
          <div style={{ marginBottom: 12 }}><Package size={18} color="var(--amber)" /></div>
          <div className="stat-value">{stats?.products ?? '—'}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="stat-card blue">
          <div style={{ marginBottom: 12 }}><Boxes size={18} color="var(--blue)" /></div>
          <div className="stat-value mono">{stats?.totalQty?.toLocaleString() ?? '—'}</div>
          <div className="stat-label">Units in stock</div>
        </div>
        <div className="stat-card">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: stats?.lowStock > 0 ? 'var(--red)' : 'var(--border)' }} />
          <div style={{ marginBottom: 12 }}><AlertTriangle size={18} color={stats?.lowStock > 0 ? 'var(--red)' : 'var(--text-muted)'} /></div>
          <div className="stat-value" style={{ color: stats?.lowStock > 0 ? 'var(--red)' : undefined }}>{stats?.lowStock ?? '—'}</div>
          <div className="stat-label">Low stock</div>
        </div>
        <div className="stat-card">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: stats?.deadStock > 0 ? 'var(--purple)' : 'var(--border)' }} />
          <div style={{ marginBottom: 12 }}><TrendingDown size={18} color={stats?.deadStock > 0 ? 'var(--purple)' : 'var(--text-muted)'} /></div>
          <div className="stat-value" style={{ color: stats?.deadStock > 0 ? 'var(--purple)' : undefined }}>{stats?.deadStock ?? '—'}</div>
          <div className="stat-label">Dead stock (60d+)</div>
        </div>
        <div className="stat-card green">
          <div style={{ marginBottom: 12 }}><MapPin size={18} color="var(--green)" /></div>
          <div className="stat-value">{stats?.locations ?? '—'}</div>
          <div className="stat-label">Locations</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '20px 20px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3>Stock levels</h3>
            <Link to="/inventory" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>View all <ArrowRight size={12} /></Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="qty" radius={[3,3,0,0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.low ? 'var(--red)' : 'var(--amber)'} fillOpacity={d.low ? 0.85 : 0.7} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}><Boxes size={32} /><span>No inventory data</span></div>
          )}
        </div>

        {['ADMIN','MANAGER'].includes(user?.role) && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Recent orders</h3>
              <Link to="/orders" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>View all <ArrowRight size={12} /></Link>
            </div>
            {orders.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><ShoppingCart size={28} /><span>No orders yet</span></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-dim)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>#{o.id?.slice(0,8)}</div>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>{o.supplier}</div>
                    </div>
                    <span className={`badge badge-${statusColor[o.status]}`}>{statusLabel[o.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {stats?.lowStock > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="var(--red)" />
              <h3 style={{ color: 'var(--red)' }}>Critical stock alerts</h3>
            </div>
            <Link to="/inventory" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Manage <ArrowRight size={12} /></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Location</th><th>Qty</th><th>Min</th><th>Discount</th></tr></thead>
              <tbody>
                {inventory.filter(i => i.quantity <= i.minQuantity).map(i => (
                  <tr key={i.id}>
                    <td><span style={{ fontWeight: 500 }}>{i.product?.name}</span></td>
                    <td><span className="text-secondary">{i.location?.name}</span></td>
                    <td><span className="mono text-red">{i.quantity}</span></td>
                    <td><span className="mono text-muted">{i.minQuantity}</span></td>
                    <td>{i.discountPct > 0 ? <span className="badge badge-amber">{i.discountPct}%</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
