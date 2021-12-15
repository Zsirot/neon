const express = require('express');
const router = express.Router();
const AppError = require('../utils/AppError');
const axios = require('axios').default;
const morgan = require('morgan');

const Order = require('../models/order');
const { Product, Variant } = require('../models/product');
const { assignAllAvailable, specifyWebhookTracking } = require('../seeds')

if (process.env.NODE_ENV !== 'production') { //if we are not in production mode
    require('dotenv').config();//require our .env file,
}

const stripe = require('stripe')(process.env.STRIPE_KEY);
const stripeEndpointSecret = process.env.STRIPE_WEBHOOK;

const base64 = require('base-64');
const encodedKey = 'Basic'.concat(' ', (base64.encode(process.env.API_KEY)))
const printfulConfig = { headers: { Authorization: encodedKey } };

const rateLimit = require("express-rate-limit");


const webhookLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 3 minute
    max: 2 // limit each IP to 2 requests per windowMs. For some reason, this limits to 4 requests. Using 1 here breaks it?
});

router.use("/printful", webhookLimiter);
// router.use("/printful", morgan('dev'))
const deleteIncompleteOrders = async function () {
    const deleteOrders = await Order.deleteMany({ fulfilled: false })
    console.log(`${deleteOrders.deletedCount} incomplete orders deleted`)
}
deleteIncompleteOrders() //runs on server start
setInterval(deleteIncompleteOrders, 1000 * 60 * 60 * 24) //runs every 24 hours




const fulfillOrder = async function (stripeOrderId) {
    try {
        const completedOrder = await stripe.checkout.sessions.retrieve(stripeOrderId); //stripeOrderId comes from a successfully completed payment
        const { customer, items } = await Order.findById(completedOrder.metadata.orderId); //looks up the DB order id which we created and stored in the metadata of the completed stripe checkout session (see the checkout/confirm post route)

        let cartItems = []
        for (item of items) { //creates a new array from the items in the fulfilled order (found in the DB), preparing payload for printful order fulfilment
            cartItems.push({
                sync_variant_id: item.sync_variant_id,
                quantity: item.qty,
                retail_price: item.price,
                currency: 'USD'
            })
        }
        const response = await axios.post('https://api.printful.com/orders', { //Sends order to printful using customer/item data from the DB
            recipient: {
                name: [customer.first_name, customer.last_name].join(' '),
                address1: customer.address_1,
                address2: customer.address_2,
                city: customer.city,
                state_code: customer.state,
                country_code: "US",
                zip: customer.zip,
                email: customer.email
            },
            items: cartItems
        }, printfulConfig);
        const order = await Order.findByIdAndUpdate(completedOrder.metadata.orderId, { fulfilled: true }, { new: true }) //Updates the completedOrder to 'true' in the DB
        order.save()
        console.log(`ORDER COMPLETE: ${response.data.result.recipient.email} ${response.data.result.dashboard_url}`)
    } catch (e) {
        console.log(e.type)
        throw new AppError(e.raw.message, 400)
    }
}



router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => { //webhook that receives successfully made stripe payments
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, sig, stripeEndpointSecret);

    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const stripeOrderId = event.data.object.id; //saved order ID from stripe we can recall in the next function
        fulfillOrder(stripeOrderId); // Fulfill the purchase...
    }
    console.log('Stripe payment succeeded')
    res.status(200).send();
})

//Workaround for printful problem resending webhooks multiple times and triggering multiple stock refreshes
//Only allows one stock update webhook every 30 seconds:

let triggerBlock = false //block is set to "false" initially

function refreshTrigger() { //when, called sets block to "false" in order to receive another update 
    let triggerBlock = false;
    console.log('trigger reset')
}
router.post('/printful', webhookLimiter, async (req, res) => {
    if (!triggerBlock) { //if block is "false", tells printful message received, blocks the any further requests, and runs functions 
        console.log('accepted')
        res.status(200).send()
        triggerBlock = true
        assignAllAvailable() // refreshes the database with live stock info from printful
        await specifyWebhookTracking() // tells printful which items' stock to track after they were assigned above
        setTimeout(refreshTrigger, 30 * 1000) //stops blocking requests after 30 seceonds
    } else {
        res.status(200).send() //notifies printful that any additional requests were received. 
        console.log('rejected')
    }
})



module.exports = router

