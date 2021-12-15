const mongoose = require('mongoose');
const axios = require('axios').default;
const base64 = require('base-64');
const { Product, Variant } = require('./models/product');
const AppError = require('./utils/AppError');


let url = process.env.URL
if (process.env.NODE_ENV !== 'production') { //if we ar enot in production mode
    require('dotenv').config();//require our .env file,
    url = process.env.NGROK_URL
}


const encodedKey = 'Basic'.concat(' ', (base64.encode(process.env.API_KEY)))
const printfulConfig = { headers: { Authorization: encodedKey } };

const pushColor = function (product, syncVariant, stockInfo) {
    let stockTrack = stockInfo.filter(obj => {
        return obj.variant_id === syncVariant.variant_id
    })
    if (stockTrack[0].stock === 'supplier_out_of_stock') {
        stockTrack = false
    } else {
        stockTrack = true
    }
    let color
    let size
    ///These two properties will require sync product titles which inlude colors to end with ' (Colors Available)'. NO "/" either
    // console.log(syncVariant.product.name.split(" ").pop().slice(1, -1))

    if (!syncVariant.name.includes('-')) {
        color = syncVariant.product.name.split(" ").pop().slice(1, -1)
    } else {
        color = syncVariant.name.split("-")[1].split("/").shift().trim()
    }
    if (!syncVariant.name.includes('/')) {
        size = ''
    } else {
        size = syncVariant.name.split(" ").pop()
    }

    product.variants.push({
        name: syncVariant.name.split("(")[0].trim(),
        variant_id: syncVariant.variant_id,
        inStock: stockTrack,
        sync_variant_id: syncVariant.id,
        variant_img: syncVariant.files[1].preview_url,
        retail_price: parseInt(syncVariant.retail_price),
        size,
        color
    })
}

const pushNoColor = function (product, syncVariant, stockInfo) {
    let stockTrack = stockInfo.filter(obj => {
        return obj.variant_id === syncVariant.variant_id
    })
    if (stockTrack[0].stock === 'supplier_out_of_stock') {
        stockTrack = false
    } else {
        stockTrack = true
    }
    let size
    if (!syncVariant.name.includes('-')) {
        size = ''
    } else {
        size = syncVariant.name.split(" ").pop()
    }
    product.variants.push({
        name: syncVariant.name,
        variant_id: syncVariant.variant_id,
        inStock: stockTrack,
        sync_variant_id: syncVariant.id,
        retail_price: syncVariant.retail_price,
        size,     // NO "/" in printful store sync product name
        variant_img: syncVariant.files[1].preview_url

    })

}


const calcPriceRange = (product) => {
    const prices = [];
    for (let variant of product.variants) {
        prices.push(variant.retail_price)
    }
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const result = `${min} - ${max}`
    return result
}

const fetchAndBuildProduct = async (syncProductId) => { // Returns a customized sync product object (and variants) from a sync product ID. 

    try {
        const res = await axios.get(`https://api.printful.com/store/products/${syncProductId}`, printfulConfig); //Gets information about a single Sync Product and its Sync Variants
        const syncVariants = res.data.result.sync_variants; //gets sync variant info
        const { name, thumbnail_url } = res.data.result.sync_product; //gets sync product info
        // console.log(res.data.result)
        const product = {
            id: syncProductId,
            name,
            thumbnail_url,
            stock_product_id: syncVariants[0].product.product_id, //stock product id here is only listed on any one of a product's variants, used to make the next GET request
            variants: []
        }
        const stockRes = await axios.get(`https://api.printful.com/products/${product.stock_product_id}`, printfulConfig); //Gets stock product info from a stock_product_id above
        const catalogInfo = stockRes.data.result // extracts result
        // console.log(syncVariants[0])
        const description = { //extracts description and formats bullets
            head: catalogInfo.product.description.split("\u2022")[0],
            bullets: catalogInfo.product.description.split("\u2022").splice(1)
        }
        product.description = description //adds description to product object
        stockInfo = []

        for (let variant of catalogInfo.variants) { ///this adds a new array for pushColor/pushNoColor to check availability against stock variant ids
            stockInfo.push({
                variant_id: variant.id, // stock variant ids
                stock: variant.availability_status[0].status //stock variant id availability
            })
        }
        for (let syncVariant of syncVariants) {
            if (syncVariant.name.includes('(Colors Available)')) { ///This means printful product names in the dashboard must NEVER include a '/'. Worth reconsidering
                // console.log(syncVariant.name)
                pushColor(product, syncVariant, stockInfo);
            } else {
                pushNoColor(product, syncVariant, stockInfo);
            }

        }

        product.price_range = calcPriceRange(product)
        const final = new Product({
            product_id: product.id,
            stock_product_id: product.stock_product_id,
            name: product.name.split("(")[0].trim(),
            description: {
                head: product.description.head,
                bullets: product.description.bullets
            },
            price_range: product.price_range,
            thumbnail_url: product.thumbnail_url,
            variants: [],
        });
        for (variant of product.variants) {
            if (variant.inStock === true) {
                const vrnt = new Variant({
                    name: variant.name,
                    variant_id: variant.variant_id,
                    inStock: variant.inStock,
                    sync_variant_id: variant.sync_variant_id,
                    size: variant.size,
                    color: variant.color,
                    retail_price: variant.retail_price,
                    variant_img: variant.variant_img,
                    parent: product._id
                })
                vrnt.save()

                final.variants.push(vrnt._id)
            }

        }
        final.save();
    } catch (e) {
        if (e.response.statusText === "Not Found") {
            console.log('error:', 'a stock product is discontinued or out of stock. Remove it from your printful store')
        } else {
            throw new AppError(e.response, e.status)
        }

    }
}

const assignAll = async function (...productIds) {
    await Product.deleteMany({});
    await Variant.deleteMany({});
    for (productId of productIds) {
        fetchAndBuildProduct(productId);
    }
}

const assignAllAvailable = async () => {
    const res = await axios.get('https://api.printful.com/store/products', printfulConfig);
    const products = res.data.result
    const syncProductIds = []
    for (let product of products) {
        syncProductIds.push(product.id)
    }
    await assignAll(...syncProductIds);
    return console.log('All products assigned')
}





const specifyWebhookTracking = async () => { // Specifies a list of events and products that trigger a webhook
    try {
        let stockProductIds = []
        const allProds = await Product.find({}) //finds all products in DB

        for (let prod of allProds) { //adds each product's stock product id to an array
            stockProductIds.push(prod.stock_product_id)
        }
        const res = await axios.post('https://api.printful.com/webhooks', { //posts triggering events and product ids to printful (including array from above)
            "url": `${url}/webhooks/printful`, //this should be a variable or the final site url
            "types": [
                "stock_updated",
                "product_synced",
                "product_updated"
            ],
            "params": {
                "stock_updated": {
                    "product_ids": stockProductIds
                }
            }
        }, printfulConfig);
        console.log('configuration sent!!')

        // console.log(res.data.result)

    } catch (e) {
        console.log('error')
        throw new AppError(e.response, e.status)
    }

}

if (process.env.NODE_ENV === 'production') { //if we are in production mode, refresh database on server start
    assignAllAvailable()
}
// fetchAndBuildProduct(218275569)
// assignAllAvailable()

module.exports = { assignAllAvailable, specifyWebhookTracking }

// Sync Products

// 218275569 Skyline Tank Top
// 259595944 Cuffed Beanie  (Colors Available)
// 259609932 Mug with Color Inside
// 218275623 Starlet's Letterman Jacket
// 218274071 Layer Bikini (Colors Available)
// 218274605 3\4 Sleeve Streetlamp Raglan Shirt
// 218275526 Short Sleeve Skyline T Shirt
// 218275656 Short Sleeve Beach T Shirt (Colors Available)
// 218274678 Short Sleeve Unisex Skyline T Shirt
// 218274347 Short Sleeve Layers V Neck T Shirt

