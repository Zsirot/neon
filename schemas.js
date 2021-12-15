const Joi = require('joi')

module.exports.variantSchema = Joi.object({
    prodId: Joi.number().required(),
    imgUrl: Joi.string().required(),
    title: Joi.string().required(),
    size: Joi.string(),
    qty: Joi.number().required(),
    color: Joi.string()
})
