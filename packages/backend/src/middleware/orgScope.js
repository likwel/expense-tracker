const prisma = require('../config/prisma')

module.exports = async function orgScope(req, res, next) {
  const orgId = req.query.orgId
    ? Number(req.query.orgId)
    : req.body?.orgId
      ? Number(req.body.orgId)
      : null

  if (!orgId) {
    req.scopeIds = [req.user.id]
    req.org      = null
    return next()
  }

  try {
    const membership = await prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId:         req.user.id,
        },
      },
      include: {
        organization: {
          include: { members: { select: { userId: true } } },
        },
      },
    })

    if (!membership)
      return res.status(403).json({ error: 'Accès à cette organisation refusé' })

    if (membership.organization.status !== 'active')
      return res.status(403).json({ error: 'Organisation suspendue ou fermée' })

    req.scopeIds = membership.organization.members.map(m => m.userId)
    req.org      = membership.organization
    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}