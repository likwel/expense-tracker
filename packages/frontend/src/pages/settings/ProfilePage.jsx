import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Camera, Check, AlertTriangle,
  Building2, Users, Pencil, Trash2, UserPlus,
  Crown, Shield, Eye, ChevronRight, X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../utils/api'

// ── Constantes ────────────────────────────────────────────────────
const PLAN_LABEL  = { free:'Gratuit', pro:'Pro', business:'Business' }
const PLAN_COLOR  = { free:'#888',    pro:'#534AB7', business:'#0F6E56' }
const PLAN_BG     = { free:'#f5f5f5', pro:'#EEEDFE', business:'#E1F5EE' }
const ROLE_LABEL  = { admin:'Administrateur', member:'Membre', viewer:'Lecteur' }
const ROLE_COLOR  = { admin:'#A32D2D', member:'#534AB7', viewer:'#5F5E5A' }
const ROLE_BG     = { admin:'#FCEBEB', member:'#EEEDFE', viewer:'#F1EFE8' }
const USAGE_LABEL = { personal:'Personnel', family:'Famille', business:'Entreprise' }
const USAGE_ICON  = { personal: User, family: Users, business: Building2 }
const USAGE_COLOR = { personal:'#534AB7', family:'#0F6E56', business:'#BA7517' }
const USAGE_BG    = { personal:'#EEEDFE', family:'#E1F5EE', business:'#FAEEDA' }
const MEMBER_ROLE_LABEL = { founder:'Fondateur', admin:'Admin', member:'Membre', viewer:'Lecteur' }
const MEMBER_ROLE_COLOR = { founder:'#BA7517', admin:'#A32D2D', member:'#534AB7', viewer:'#5F5E5A' }
const MEMBER_ROLE_ICON  = { founder: Crown, admin: Shield, member: User, viewer: Eye }

// ── Champ texte ───────────────────────────────────────────────────
function Field({ label, type='text', value, onChange, placeholder, readOnly }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:700, color:'#888',
        textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          display:'block', width:'100%', boxSizing:'border-box',
          padding:'11px 14px', borderRadius:12, fontSize:14,
          color: readOnly ? '#aaa' : '#222', outline:'none',
          border:`1.5px solid ${focused && !readOnly ? '#6C5CE7' : '#eee'}`,
          background: readOnly ? '#f7f7f7' : '#fafafa', transition:'border-color 0.15s',
        }}
      />
    </div>
  )
}

// ── Bloc section ──────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ margin:'0 16px 12px', background:'#fff', borderRadius:16,
      padding:'16px', border:'0.5px solid #eee' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
        textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────
function Badge({ label, color, bg, icon: Icon }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      background:bg, color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
      {Icon && <Icon size={11} strokeWidth={2}/>}
      {label}
    </span>
  )
}

// ── Modal membre ──────────────────────────────────────────────────
function MemberModal({ member, onClose, onChangeRole, onRemove, isFounder, isSelf }) {
  const roles = ['admin','member','viewer']
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
      zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:'20px 20px 0 0',
        padding:'20px 20px 40px', animation:'slideUp 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'#222' }}>{member.user.name}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa' }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ fontSize:12, color:'#aaa', marginBottom:16 }}>{member.user.email}</div>

        {!isSelf && !isFounder && (
          <>
          {orgs.length === 0 && (
            <Section title="Organisation">
              <div style={{ textAlign:'center', padding:'20px 0', color:'#ccc' }}>
                <Users size={32} color="#e0e0e0" style={{ margin:'0 auto 8px', display:'block' }}/>
                <div style={{ fontSize:13, marginBottom:4 }}>Aucune organisation</div>
                <div style={{ fontSize:12 }}>Vous n'êtes membre d'aucune organisation</div>
              </div>
            </Section>
          )}
            <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
              textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:10 }}>
              Changer le rôle
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
              {roles.map(r => {
                const RIcon = MEMBER_ROLE_ICON[r] || User
                const active = member.role === r
                return (
                  <button key={r} onClick={() => onChangeRole(member.id, r)} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    borderRadius:12, border:`1.5px solid ${active ? MEMBER_ROLE_COLOR[r] : '#eee'}`,
                    background: active ? MEMBER_ROLE_COLOR[r]+'18' : '#fafafa',
                    cursor:'pointer', textAlign:'left',
                  }}>
                    <RIcon size={16} color={active ? MEMBER_ROLE_COLOR[r] : '#aaa'} strokeWidth={1.8}/>
                    <span style={{ fontSize:13, fontWeight:600,
                      color: active ? MEMBER_ROLE_COLOR[r] : '#555' }}>
                      {MEMBER_ROLE_LABEL[r]}
                    </span>
                    {active && <Check size={14} color={MEMBER_ROLE_COLOR[r]} style={{ marginLeft:'auto' }}/>}
                  </button>
                )
              })}
            </div>
            <button onClick={() => onRemove(member.id)} style={{
              width:'100%', padding:'12px', borderRadius:12, cursor:'pointer',
              background:'#FCEBEB', border:'none', fontWeight:700, fontSize:14, color:'#E24B4A',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              <Trash2 size={15}/> Retirer de l'organisation
            </button>
          </>
        )}
        {(isSelf || isFounder) && (
          <div style={{ fontSize:13, color:'#aaa', textAlign:'center', padding:'8px 0' }}>
            {isFounder ? 'Le fondateur ne peut pas être modifié' : 'Vous ne pouvez pas modifier votre propre rôle'}
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
    </div>
  )
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [name,     setName]     = useState(user?.name  || '')
  const [email,    setEmail]    = useState(user?.email || '')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  // Organisation
  const [orgs,       setOrgs]       = useState([])
  const [activeOrg,  setActiveOrg]  = useState(null)  // org sélectionnée
  const [members,    setMembers]    = useState([])
  const [editOrgName, setEditOrgName] = useState('')
  const [editingOrg,  setEditingOrg]  = useState(false)
  const [savingOrg,   setSavingOrg]   = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)

  const plan      = user?.plan      || 'free'
  const role      = user?.role      || 'member'
  const usageType = user?.usageType || user?.usage_type || 'personal'
  const UsageIcon = USAGE_ICON[usageType] || User
  const isAdmin   = role === 'admin'

  // Debug — à retirer en production
  // console.log('user:', user)
  // console.log('usageType:', usageType)

  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3000) }

  // ── Charger les organisations ─────────────────────────────────
  useEffect(() => {
    if (!user || usageType === 'personal') return
    api.get('/organizations/mine')
      .then(({ data }) => {
        setOrgs(data || [])
        if (data?.length > 0) {
          setActiveOrg(data[0])
          setEditOrgName(data[0].name)
        }
      })
      .catch(() => {})
  }, [usageType])

  // ── Charger les membres de l'org active ───────────────────────
  useEffect(() => {
    if (!activeOrg) return
    api.get(`/organizations/${activeOrg.id}/members`)
      .then(({ data }) => setMembers(data || []))
      .catch(() => {})
  }, [activeOrg])

  const myMembership = members.find(m => m.userId === user?.id)
  const myOrgRole    = myMembership?.role
  // Seul founder ou admin de l'org peut gérer — pas juste role global
  const canManage    = myOrgRole === 'founder' || myOrgRole === 'admin'

  // ── Profil ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim())  return showMsg(false, 'Le nom ne peut pas être vide')
    if (!email.trim()) return showMsg(false, "L'email ne peut pas être vide")
    setSaving(true)
    try {
      const { data } = await api.put('/auth/profile', { name, email })
      if (setUser) setUser(prev => ({ ...prev, name: data.name, email: data.email }))
      showMsg(true, 'Profil mis à jour')
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur')
    } finally { setSaving(false) }
  }

  // ── Renommer organisation ──────────────────────────────────────
  const handleSaveOrg = async () => {
    if (!editOrgName.trim() || !activeOrg) return
    setSavingOrg(true)
    try {
      const { data } = await api.put(`/organizations/${activeOrg.id}`, { name: editOrgName })
      setActiveOrg(data)
      setOrgs(prev => prev.map(o => o.id === data.id ? data : o))
      setEditingOrg(false)
      showMsg(true, 'Organisation mise à jour')
    } catch (e) {
      showMsg(false, e.response?.data?.error || 'Erreur')
    } finally { setSavingOrg(false) }
  }

  // ── Changer le rôle d'un membre ───────────────────────────────
  const handleChangeRole = async (memberId, newRole) => {
    try {
      await api.patch(`/organizations/${activeOrg.id}/members/${memberId}`, { role: newRole })
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      setSelectedMember(null)
      showMsg(true, 'Rôle mis à jour')
    } catch (e) { showMsg(false, e.response?.data?.error || 'Erreur') }
  }

  // ── Retirer un membre ─────────────────────────────────────────
  const handleRemoveMember = async (memberId) => {
    if (!confirm('Retirer ce membre ?')) return
    try {
      await api.delete(`/organizations/${activeOrg.id}/members/${memberId}`)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      setSelectedMember(null)
      showMsg(true, 'Membre retiré')
    } catch (e) { showMsg(false, e.response?.data?.error || 'Erreur') }
  }

  return (
    <div style={{ paddingBottom:48, minHeight:'100vh', background:'#f7f6fd' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12,
        padding:'14px 20px', borderBottom:'1px solid #f0f0f0',
        background:'#fff', position:'sticky', top:0, zIndex:10 }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#6C5CE7', padding:4 }}>
          <ArrowLeft size={22}/>
        </button>
        <span style={{ fontWeight:800, fontSize:17, color:'#222' }}>Mon profil</span>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ margin:'10px 16px 0', padding:'11px 14px', borderRadius:12,
          background: msg.ok ? '#E1F5EE' : '#FCEBEB',
          border:`1px solid ${msg.ok ? '#9FE1CB' : '#F09595'}`,
          display:'flex', alignItems:'center', gap:8 }}>
          {msg.ok ? <Check size={15} color="#0F6E56" strokeWidth={2.5}/> : <AlertTriangle size={15} color="#A32D2D"/>}
          <span style={{ fontSize:13, fontWeight:600, color: msg.ok ? '#0F6E56' : '#A32D2D' }}>{msg.text}</span>
        </div>
      )}

      {/* Avatar */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 20px 18px' }}>
        <div style={{ position:'relative' }}>
          <div style={{ width:76, height:76, borderRadius:38, background:'#6C5CE7',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:30, fontWeight:800, color:'#fff' }}>
            {name?.trim().charAt(0).toUpperCase() || <User size={30} color="#fff"/>}
          </div>
          <button style={{ position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:13,
            background:'#fff', border:'2px solid #6C5CE7',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Camera size={13} color="#6C5CE7"/>
          </button>
        </div>
        <div style={{ marginTop:10, fontSize:16, fontWeight:800, color:'#222' }}>{user?.name}</div>
        <div style={{ fontSize:13, color:'#aaa', marginTop:3 }}>{user?.email}</div>
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap', justifyContent:'center' }}>
          <Badge label={PLAN_LABEL[plan]||plan}       color={PLAN_COLOR[plan]}       bg={PLAN_BG[plan]}/>
          <Badge label={ROLE_LABEL[role]||role}       color={ROLE_COLOR[role]}       bg={ROLE_BG[role]}/>
          <Badge label={USAGE_LABEL[usageType]||usageType} color={USAGE_COLOR[usageType]} bg={USAGE_BG[usageType]} icon={UsageIcon}/>
        </div>
      </div>

      {/* Infos personnelles */}
      <Section title="Informations personnelles">
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Field label="Nom complet"    value={name}  onChange={e => setName(e.target.value)}  placeholder="Jean Dupont"/>
          <Field label="Adresse e-mail" type="email"  value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com"/>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          width:'100%', marginTop:16, padding:'12px', borderRadius:12,
          background: saving ? '#a09bda' : '#6C5CE7', border:'none',
          color:'#fff', fontWeight:700, fontSize:14,
          cursor: saving ? 'not-allowed' : 'pointer', transition:'background 0.2s',
        }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </Section>

      {/* Compte & accès */}
      <Section title="Compte & accès">
        {[
          { label:'Rôle',               value: ROLE_LABEL[role]||role,               color: ROLE_COLOR[role] },
          { label:"Type d'utilisation", value: USAGE_LABEL[usageType]||usageType,    color: USAGE_COLOR[usageType] },
          { label:"Devise d'affichage", value: user?.currency||'MGA',                color:'#222' },
          { label:'Devise de base',     value: user?.defaultCurrency||'MGA',         color:'#aaa' },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'11px 0', borderBottom: i < arr.length-1 ? '0.5px solid #f5f5f5' : 'none' }}>
            <span style={{ fontSize:13, color:'#888' }}>{label}</span>
            <span style={{ fontSize:13, fontWeight:600, color }}>{value}</span>
          </div>
        ))}
        <div style={{ marginTop:10, fontSize:11, color:'#bbb', lineHeight:1.5 }}>
          La devise de base est fixée à l'inscription et ne change jamais.
        </div>
      </Section>

      {/* ── Organisation — visible si family ou business ── */}
      {usageType !== 'personal' && (
        <>
          {/* Sélecteur si plusieurs orgs */}
          {orgs.length > 1 && (
            <Section title="Mes organisations">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {orgs.map(org => {
                  const OrgIcon = org.type === 'family' ? Users : Building2
                  const orgColor = org.type === 'family' ? '#0F6E56' : '#BA7517'
                  const orgBg    = org.type === 'family' ? '#E1F5EE' : '#FAEEDA'
                  return (
                    <button key={org.id} onClick={() => { setActiveOrg(org); setEditOrgName(org.name) }}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                        borderRadius:12, border:`1.5px solid ${activeOrg?.id===org.id ? orgColor : '#eee'}`,
                        background: activeOrg?.id===org.id ? orgBg : '#fafafa',
                        cursor:'pointer', textAlign:'left' }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:orgBg,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <OrgIcon size={18} color={orgColor} strokeWidth={1.8}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#222' }}>{org.name}</div>
                        <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{MEMBER_ROLE_LABEL[org.myRole||'member']}</div>
                      </div>
                      <ChevronRight size={16} color="#ccc"/>
                    </button>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Détail organisation active */}
          {activeOrg && (
            <Section title={`Organisation — ${activeOrg.type === 'family' ? 'Famille' : 'Entreprise'}`}>
              {/* Nom + renommer si founder/admin de l'org */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  {editingOrg && canManage ? (
                    <input value={editOrgName} onChange={e => setEditOrgName(e.target.value)}
                      autoFocus
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, boxSizing:'border-box',
                        border:'1.5px solid #6C5CE7', fontSize:14, outline:'none', background:'#fafafa' }}/>
                  ) : (
                    <div style={{ fontSize:16, fontWeight:800, color:'#222' }}>{activeOrg.name}</div>
                  )}
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                    {members.length} membre{members.length > 1 ? 's' : ''}
                    {myOrgRole && (
                      <span style={{ marginLeft:8, fontWeight:700,
                        color: MEMBER_ROLE_COLOR[myOrgRole] }}>
                        · {MEMBER_ROLE_LABEL[myOrgRole]}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  editingOrg ? (
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setEditingOrg(false)}
                        style={{ padding:'7px 12px', borderRadius:10, background:'#f5f5f5',
                          border:'none', cursor:'pointer', fontSize:12, color:'#888', fontWeight:600 }}>
                        Annuler
                      </button>
                      <button onClick={handleSaveOrg} disabled={savingOrg}
                        style={{ padding:'7px 12px', borderRadius:10, background:'#6C5CE7',
                          border:'none', cursor:'pointer', fontSize:12, color:'#fff', fontWeight:700 }}>
                        {savingOrg ? '...' : 'Sauver'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingOrg(true)}
                      style={{ width:34, height:34, borderRadius:10, background:'#f5f5f5',
                        border:'none', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Pencil size={15} color="#aaa"/>
                    </button>
                  )
                )}
              </div>

              {/* Liste membres — visible pour tous, actions uniquement pour founder/admin */}
              <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
                textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:10 }}>
                Membres
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {members.map(m => {
                  const RoleIcon = MEMBER_ROLE_ICON[m.role] || User
                  const roleColor = MEMBER_ROLE_COLOR[m.role] || '#888'
                  const isSelf    = m.userId === user?.id
                  return (
                    <button key={m.id}
                      onClick={() => canManage && !isSelf && m.role !== 'founder'
                        ? setSelectedMember(m) : null}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                        borderRadius:12, border:'0.5px solid #f0f0f0', background:'#fafafa',
                        cursor: canManage && !isSelf && m.role !== 'founder' ? 'pointer' : 'default',
                        textAlign:'left', width:'100%' }}>
                      <div style={{ width:36, height:36, borderRadius:18, background:'#6C5CE7',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>
                        {m.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'#222' }}>
                            {m.user?.name}
                          </span>
                          {isSelf && <span style={{ fontSize:10, color:'#aaa' }}>(vous)</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{m.user?.email}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px',
                          borderRadius:20, background: roleColor+'18', color: roleColor }}>
                          <RoleIcon size={10} style={{ marginRight:3 }}/>{MEMBER_ROLE_LABEL[m.role]}
                        </span>
                        {canManage && !isSelf && m.role !== 'founder' && (
                          <ChevronRight size={14} color="#ccc"/>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Inviter — admin seulement */}
              {canManage && (
                <button onClick={() => navigate(`/organizations/${activeOrg.id}/invite`)}
                  style={{ width:'100%', marginTop:12, padding:'11px', borderRadius:12,
                    background:'#f7f6fd', border:'1.5px dashed #CECBF6',
                    cursor:'pointer', display:'flex', alignItems:'center',
                    justifyContent:'center', gap:8, fontWeight:600, fontSize:13, color:'#6C5CE7' }}>
                  <UserPlus size={15}/> Inviter un membre
                </button>
              )}
            </Section>
          )}
        </>
      )}

      {/* Infos compte */}
      <Section title="Informations">
        {[
          { label:'Membre depuis', value: user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
              : '—' },
          { label:'Identifiant',  value:`#${user?.id||'—'}` },
          { label:'Abonnement',   value: PLAN_LABEL[plan]||plan, color: PLAN_COLOR[plan] },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            paddingBottom:10, marginBottom:10, borderBottom:'0.5px solid #f5f5f5' }}>
            <span style={{ fontSize:13, color:'#888' }}>{label}</span>
            <span style={{ fontSize:13, fontWeight:600, color: color||'#222' }}>{value}</span>
          </div>
        ))}
      </Section>

      {/* Modal membre */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          isFounder={selectedMember.role === 'founder'}
          isSelf={selectedMember.userId === user?.id}
          onClose={() => setSelectedMember(null)}
          onChangeRole={handleChangeRole}
          onRemove={handleRemoveMember}
        />
      )}
    </div>
  )
}