const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const axios = require('axios').default;

const Cart = require('../cart');
const Order = require('../models/order')
const currency = require('currency.js');
const { verifyConfirmation, verifyCheckout } = require('../utils/verifications')

let url = process.env.URL
if (process.env.NODE_ENV !== 'production') { //if we ar enot in production mode
    require('dotenv').config();//require our .env file,
    url = process.env.NGROK_URL
}


const stripe = require('stripe')(process.env.STRIPE_KEY);
const base64 = require('base-64');
const encodedKey = 'Basic'.concat(' ', (base64.encode(process.env.API_KEY)))
const printfulConfig = { headers: { Authorization: encodedKey } };


const calcShipping = async (customer, items) => {
    try {

        const response = await axios.post('https://api.printful.com/orders/estimate-costs', {
            recipient: {
                name: [customer.first_name, customer.last_name].join(' '),
                address1: customer.address_1,
                address2: customer.address_2,
                city: customer.city,
                state_code: customer.state,
                country_code: "US",
                zip: customer.zip
            },
            items
        }, printfulConfig);
        const { subtotal, shipping, tax } = response.data.result.costs

        const retailCost = response.data.result.retail_costs.subtotal
        prices = {
            subtotal,
            shipping,
            tax,
            total: parseFloat((retailCost + shipping).toFixed(2)),
            retailCost: retailCost.toFixed(2)
        }

        return prices
    } catch (e) {
        throw new AppError(e.response.data.result, 400)
    }
}


router.get('/', verifyCheckout, (req, res) => {
    let cart = {}
    if (!req.session.cart) {
        cart = new Cart()
    } else {
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
    }
    cart.calculateTotals()
    res.render('checkout', { cart })
})

router.patch('/:id', (req, res) => {
    try {
        let cart = {}
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        const qty = req.body.qty;
        const productId = req.params.id;
        cart.updateCart([productId], [qty])
        cart.saveCart(req);
        req.flash('success', 'Item quantity updated')
        res.redirect('/store/checkout');
    } catch (e) {
        throw new AppError('Item not in cart', 404)
    }
})

router.delete('/:id', (req, res) => {
    try {
        let cart = {}
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        const productId = req.params.id;
        cart.removeFromCart(productId)
        cart.saveCart(req);
        if (cart.data.items.length == 0) {
            req.flash('success', 'No items in cart, returned to store')
            return res.redirect('/store')
        }
        req.flash('success', 'Item removed from cart');
        res.redirect('/store/checkout');
    } catch (e) {
        throw new AppError('Item not in cart', 404)
    }
})

router.post('/', verifyCheckout, catchAsync(async (req, res) => {
    try {
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        req.session.customer = req.body
        const customer = req.session.customer
        let prices = {}
        let cartItems = []
        for (item of cart.data.items) {
            cartItems.push({
                sync_variant_id: item.sync_variant_id,
                quantity: item.qty,
                retail_price: item.price,
                currency: 'USD'
            })
        }
        customer.prices = await calcShipping(customer, cartItems)
        prices = customer.prices
        res.render('confirm', { cart, prices, customer })
    } catch (e) {
        throw new AppError(e.message, 400)
    }
}))

router.post('/confirm', verifyCheckout, verifyConfirmation, catchAsync(async (req, res) => {
    try {
        const customer = req.session.customer //retrieve customer info from session
        let cart = {}
        const { data, items, totals } = req.session.cart
        cart = new Cart(data, items, totals)
        let line_items = [];
        for (let item of cart.data.items) { //for each item in the cart...
            const itemData = { //map a new object
                price_data: {
                    currency: 'usd', //US shipping only. Autofilled
                    product_data: {
                        name: item.title,
                        images: [item.image],
                        // metadata: {
                        //     sync_variant_id: item.sync_variant_id
                        // }
                    },
                    unit_amount_decimal: currency(item.price).intValue,
                },
                quantity: item.qty,
            }
            // console.log(itemData.price_data.product_data)
            line_items.push(itemData)
        }
        line_items.push({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Shipping',
                },
                unit_amount_decimal: currency(customer.prices.shipping).intValue
            },
            quantity: 1
        })

        const order = new Order({
            items,
            customer,
            fulfilled: false
        })
        order.save()
        const session = await stripe.checkout.sessions.create({
            customer_email: customer.email,
            submit_type: 'pay',
            line_items,
            metadata: {
                "orderId": `${order._id}`
            },
            payment_method_types: [
                'card',
            ],
            mode: 'payment',
            success_url: `${url}/store/checkout/receipt`,
            cancel_url: `${url}/store/checkout`,
        });
        customer.order_id = order._id

        req.session.customer.first_name = ''
        req.session.customer.last_name = ''
        req.session.customer.email = ''
        req.session.customer.address_1 = ''
        req.session.customer.address_2 = ''
        req.session.customer.city = ''
        req.session.customer.state = ''
        req.session.customer.zip = ''
        res.redirect(303, session.url)
    } catch (e) {
        req.flash('error', 'Confirmation expired, returning to checkout')
        res.redirect('/store/checkout')
    }
}));

router.get('/receipt', catchAsync(async (req, res) => {
    try {
        const order = await Order.findById(req.session.customer.order_id); //find order in db
        if (order.fulfilled === true) {
            const { customer, items } = order
            const prices = customer.prices
            res.render('receipt', { customer, items, prices });
            req.session.destroy();
        }
    } catch (e) {
        throw new AppError('Order confirmation expired or failed', 404)
    }
}))







module.exports = router