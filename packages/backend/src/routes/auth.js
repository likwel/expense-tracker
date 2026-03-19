const router   = require('express').Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const validate = require('../middleware/validate')
const auth     = require('../middleware/auth')

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  currency: Joi.string().max(10).default('MGA'),
})

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
})

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 12)
    const user = await prisma.user.create({
      data:   { ...req.body, password: hash },
      select: { id:true, name:true, email:true, currency:true, createdAt:true },
    })
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    res.status(201).json({ user, token })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: e.message })
  }
})

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } })
    if (!user || !(await bcrypt.compare(req.body.password, user.password)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    const { password: _, ...safe } = user
    res.json({ user: safe, token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id:true, name:true, email:true, currency:true },
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
