const router = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')

router.use(auth)

// ── GET /organizations/mine — mes organisations ───────────────────
router.get('/mine', async (req, res) => {
  try {
    const memberships = await prisma.orgMember.findMany({
      where:   { userId: req.user.id },
      include: { organization: { include: { _count: { select: { members: true } } } } },
    })
    const orgs = memberships.map(m => ({
      ...m.organization,
      myRole: m.role,
    }))
    res.json(orgs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /organizations/search — recherche ─────────────────────────
router.get('/search', async (req, res) => {
  const { q, type } = req.query
  if (!q || q.length < 2) return res.json([])
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        name:   { contains: q, mode: 'insensitive' },
        status: 'active',
        ...(type && type !== 'personal' ? { type } : {}),
      },
      include: { _count: { select: { members: true } } },
      take: 8,
    })
    res.json(orgs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /organizations/:id — renommer ─────────────────────────────
router.put('/:id', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })
  try {
    // Vérifier que l'utilisateur est admin/fondateur
    const member = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: Number(req.params.id), userId: req.user.id } },
    })
    if (!member || !['founder','admin'].includes(member.role))
      return res.status(403).json({ error: 'Permission insuffisante' })

    const org = await prisma.organization.update({
      where: { id: Number(req.params.id) },
      data:  { name: name.trim() },
    })
    res.json(org)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /organizations/:id/members ────────────────────────────────
router.get('/:id/members', async (req, res) => {
  try {
    const members = await prisma.orgMember.findMany({
      where:   { organizationId: Number(req.params.id) },
      include: { user: { select: { id:true, name:true, email:true, currency:true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })
    res.json(members)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PATCH /organizations/:id/members/:memberId — changer rôle ─────
router.patch('/:id/members/:memberId', async (req, res) => {
  const { role } = req.body
  const validRoles = ['admin','member','viewer']
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  try {
    const requester = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: Number(req.params.id), userId: req.user.id } },
    })
    if (!requester || !['founder','admin'].includes(requester.role))
      return res.status(403).json({ error: 'Permission insuffisante' })

    const updated = await prisma.orgMember.update({
      where: { id: Number(req.params.memberId) },
      data:  { role },
    })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /organizations/:id/members/:memberId ───────────────────
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const requester = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: Number(req.params.id), userId: req.user.id } },
    })
    if (!requester || !['founder','admin'].includes(requester.role))
      return res.status(403).json({ error: 'Permission insuffisante' })

    const target = await prisma.orgMember.findUnique({ where: { id: Number(req.params.memberId) } })
    if (target?.role === 'founder') return res.status(403).json({ error: 'Impossible de retirer le fondateur' })

    await prisma.orgMember.delete({ where: { id: Number(req.params.memberId) } })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router