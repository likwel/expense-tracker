// middleware/adminAuth.js
const prisma = require('../config/prisma')

module.exports = async (req, res, next) => {
  try {
    // req.user est déjà attaché par le middleware auth précédent
    if (!req.user?.id) return res.status(401).json({ error: 'Non authentifié' })

    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé — droits admin requis' })
    }

    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}