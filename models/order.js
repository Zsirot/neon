const mongoose = require('mongoose')
const { Schema } = mongoose;

const orderSchema = new Schema({
    fulfilled: {
        type: Boolean,
        required: true
    },
    items: [
        {
            title: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            qty: {
                type: Number,
                required: true
            },
            image: {
                type: String,
                required: true
            },
            color: String,
            size: String,
            sync_variant_id: {
                type: Number,
                required: true
            }
        }
    ],
    customer: {
        first_name: {
            type: String,
            required: true
        },
        last_name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        address_1: {
            type: String,
            required: true
        },
        address_2: String,
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zip: {
            type: Number,
            required: true
        },
        prices: {
            subtotal: {
                type: Number,
                required: true
            },
            shipping: {
                type: Number,
                required: true
            },
            tax: {
                type: Number,
                required: true
            },
            total: {
                type: Number,
                required: true
            },
            retailCost: {
                type: Number,
                required: true
            }
        }
    }

})

module.exports = mongoose.model('Order', orderSchema)