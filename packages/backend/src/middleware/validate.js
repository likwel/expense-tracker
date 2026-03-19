const Joi = require('joi')

module.exports = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error)
    return res.status(400).json({ error: error.details.map(d => d.message).join(', ') })
  next()
}
