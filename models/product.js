const { required } = require('joi');
const mongoose = require('mongoose')
const { Schema } = mongoose;

const variantSchema = new Schema({
    name: {
        type: String,
        require: true
    },
    inStock: {
        type: Boolean,
        require: true
    },
    variant_id: {
        type: Number,
        require: true
    },
    sync_variant_id: {
        type: Number,
        require: true
    },
    size: {
        type: String,
        require: true
    },
    color: String,
    retail_price: {
        type: String,
        required: true
    },
    variant_img: String,
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        require: true
    }
})

const productSchema = new Schema({
    product_id: {
        type: Number,
        required: true
    },
    stock_product_id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        require: true
    },
    price_range: String,
    thumbnail_url: {
        type: String,
        required: true
    },
    description: {
        head: String,
        bullets: [String],
    },
    variants: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Variant'
        }
    ]

})

const Product = mongoose.model('Product', productSchema);
const Variant = mongoose.model('Variant', variantSchema);

module.exports = { Product, Variant };