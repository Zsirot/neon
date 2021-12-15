const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const Cart = require('../cart');
const { Product, Variant } = require('../models/product');
const { variantSchema } = require('../schemas')


const findProduct = async function (prodId, color, size) {
    try {
        const product = await Product.find({ product_id: prodId }).populate('variants');
        let found
        if (product[0].variants[0].size) {
            found = product[0].variants.find(function (vrnt) {
                return vrnt.size === size && vrnt.color === color
            })
        } else if (product[0].variants[0].color) {
            found = product[0].variants.find(function (vrnt) {
                return vrnt.color === color
            })
        } else {
            found = product[0].variants.find(function (vrnt) {
                return vrnt.name === product[0].variants[0].name
            })
        }
        return found
    } catch (e) {
        throw new AppError('Product Not Found', 404)
    }
}

const validateVariant = (req, res, next) => {
    const { error } = variantSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new AppError(msg, 400)
    } else {
        next()
    }
}

router.get('/', catchAsync(async (req, res) => {
    //render db collection to main store, including items in cart

    let cart = {}
    if (!req.session.cart) {
        cart = new Cart()
    } else {
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
    }
    cart.calculateTotals()
    const allItems = await Product.find({}).populate('variants');
    res.render('store', { allItems, cart })
}))

router.post('/', validateVariant, catchAsync(async (req, res) => {
    try {
        const { prodId, color, size, qty } = await req.body // receive user selection
        // console.log(req.body)
        const addedItem = await findProduct(prodId, color, size);

        let cart = {}
        if (!req.session.cart) {
            cart = new Cart()
        } else {
            const { data, items, totals } = req.session.cart
            cart = new Cart(data, items, totals)
        }

        await Variant.findById(addedItem.id).then(item => {
            cart.addToCart(item, qty)
            cart.saveCart(req);
        })

        req.flash('success', 'Item added to cart')
        res.redirect('/store');
    } catch (e) {
        console.log(e)
        throw new AppError('Item Not Found', 404)
    };

}))

router.delete('/', (req, res) => {
    try {
        let cart = {}
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        cart.emptyCart(req);
        cart.saveCart(req);
        req.flash('success', 'Cart emptied')
        res.redirect('/store')
    } catch (e) {
        throw new AppError('No items in cart', 404)
    }
})
router.delete('/:id', (req, res) => {
    try {
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        const productId = req.params.id;
        cart.removeFromCart(productId)
        cart.saveCart(req);
        req.flash('success', 'Item removed from cart')
        res.redirect('/store')
    } catch (e) {
        throw new AppError('Item not in cart', 404)
    }
})

router.patch('/:id', (req, res) => {
    try {
        let cart = {}
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        const qty = req.body.qty
        const productId = req.params.id;
        cart.updateCart([productId], [qty])
        cart.saveCart(req);
        req.flash('success', 'Item quantity updated')
        res.redirect('/store')
    } catch (e) {
        throw new AppError('Item not in cart', 404)
    }
})

module.exports = router