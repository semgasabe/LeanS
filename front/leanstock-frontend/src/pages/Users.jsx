import { useEffect, useState, useCallback } from 'react'
import { Users, Edit2, Trash2 } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const ROLE_COLOR = { ADMIN:'red', MANAGER:'blue', STAFF:'muted' }
const ROLE_LABEL = { ADMIN:'Admin', MANAGER:'Manager', STAFF:'Staff' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [users, setUsers]     = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]       = useState({ name:'', role:'STAFF', locationId:'' })
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, l] = await Promise.all([api.get('/users'), api.get('/locations')])
      setUsers(u.data.data || u.data || [])
      setLocations(l.data.data || l.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(u)   { setSelected(u); setForm({ name:u.name, role:u.role, locationId:u.locationId||'' }); setModal('edit') }
  function openDelete(u) { setSelected(u); setModal('delete') }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/users/${selected.id}`, form)
      toast('User updated', 'success')
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setSaving(false) }
  }

  async function del() {
    setSaving(true)
    try {
      await api.delete(`/users/${selected.id}`)
      toast('User deleted', 'success')
      setModal(null); load()
    } catch (e) {
      // Show the real error message from backend (e.g. foreign key constraint)
      toast(e.response?.data?.error || 'Failed to delete user', 'error')
      setModal(null)
    }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth:900 }}>
      <div className="page-header">
        <div className="page-title-row">
          <h1>Users</h1>
          <span className="page-subtitle">{users.length} users in the system</span>
        </div>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Location</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center' }}><span className="spinner" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><Users size={40} /><span>No users found</span></div></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--bg-elevated)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--amber)', flexShrink:0 }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight:500 }}>{u.name}</span>
                      {u.id === me?.id && <span className="badge badge-amber" style={{ fontSize:10 }}>You</span>}
                    </div>
                  </td>
                  <td><span className="text-secondary" style={{ fontSize:12 }}>{u.email}</span></td>
                  <td><span className={`badge badge-${ROLE_COLOR[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                  <td><span className="text-secondary">{u.location?.name || '—'}</span></td>
                  <td>{u.emailVerified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-muted">Pending</span>}</td>
                  <td><span className="text-muted" style={{ fontSize:12 }}>{new Date(u.createdAt).toLocaleDateString()}</span></td>
                  <td>
                    {u.id !== me?.id && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEdit(u)}><Edit2 size={13} /></button>
                        <button className="btn btn-icon btn-danger btn-sm" onClick={() => openDelete(u)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'edit' && (
        <Modal title={`Edit: ${selected?.name}`} onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Save'}</button></>}>
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
          <div className="form-group"><label>Role</label>
            <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              {Object.entries(ROLE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div className="form-group"><label>Location (optional)</label>
            <select value={form.locationId} onChange={e => setForm(f=>({...f,locationId:e.target.value}))}>
              <option value="">— Not assigned —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete user" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={del} disabled={saving}>{saving ? <span className="spinner" style={{ width:14,height:14 }} /> : 'Delete'}</button></>}>
          <p style={{ color:'var(--text-secondary)' }}>
            Delete user <strong style={{ color:'var(--text-primary)' }}>"{selected?.name}"</strong>?<br />
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Note: users with activity logs or stock movements cannot be deleted.</span>
          </p>
        </Modal>
      )}
    </div>
  )
}
