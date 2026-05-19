import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Boxes, ShoppingCart, MapPin, Users, LogOut, Menu, X, ChevronRight, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',  icon: Package,         label: 'Products' },
  { to: '/inventory', icon: Boxes,           label: 'Inventory' },
  { to: '/orders',    icon: ShoppingCart,    label: 'Orders',   roles: ['ADMIN','MANAGER'] },
  { to: '/locations', icon: MapPin,          label: 'Locations' },
  { to: '/users',     icon: Users,           label: 'Users',    roles: ['ADMIN'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() { await logout(); navigate('/login') }

  const navItems = NAV.filter(n => !n.roles || n.roles.includes(user?.role))

  const Sidebar = ({ mobile }) => (
    <aside style={{ width: mobile ? '100%' : 220, minHeight: mobile ? 'auto' : '100vh', background: 'var(--bg-surface)', borderRight: mobile ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--amber)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>LeanStock</span>
        </div>
        {mobile && <button className="btn btn-icon btn-ghost" onClick={() => setOpen(false)}><X size={18} /></button>}
      </div>
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(n => {
          const active = pathname === n.to || (n.to !== '/' && pathname.startsWith(n.to))
          return (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--amber)' : 'var(--text-secondary)', background: active ? 'var(--amber-glow)' : 'transparent', transition: 'all var(--transition)' }}>
              <n.icon size={16} />
              {n.label}
              {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
            </Link>
          )
        })}
      </nav>
      <div style={{ borderTop: '1px solid var(--border)', padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user?.role}</div>
        </div>
        <button className="btn btn-icon btn-ghost btn-sm" onClick={handleLogout} title="Sign out"><LogOut size={15} /></button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setOpen(false)} />}
      {open && <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 999, boxShadow: '4px 0 24px rgba(0,0,0,0.5)' }}><Sidebar mobile /></div>}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 52, flexShrink: 0, background: 'var(--bg-surface)' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setOpen(true)}><Menu size={18} /></button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>LeanStock</span>
        </div>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 24px' }}>{children}</main>
      </div>
    </div>
  )
}
