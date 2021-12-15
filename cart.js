// Code below (along with corresponding use of Cart class in other project files) was restructured from the following Github repository:

// ***************************************************************************************/
//*     Title: Node.js-Shopping-Cart
//*     Author: Gabriele Romanato
// *    Date: 2017
// *    Availability: https://github.com/gabrieleromanato/Node.js-Shopping-Cart
// *
// ***************************************************************************************/
// License:

// Copyright (c) 2017 Gabriele Romanato

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


module.exports = class Cart {
    constructor(data, items, totals) {
        this.data = data || {};
        this.data.items = items || [];
        this.data.totals = totals || 0;
    }
    inCart(productID = 0) {
        let found = false;
        this.data.items.forEach(item => {
            if (item.id === productID) {
                found = true;
            }
        });
        return found;
    }
    calculateTotals() {
        this.data.itemTotals = 0
        this.data.totals = 0;
        this.data.items.forEach(item => {
            let price = item.price;
            let qty = item.qty;
            let amount = price * qty
            this.data.totals += amount;
            this.data.itemTotals += parseInt(qty)
        });

    }
    addToCart(product = null, qty = 1) {
        if (!this.inCart(product.id)) {
            let prod = {
                id: product.id,
                title: product.name,
                price: product.retail_price,
                qty: parseInt(qty),
                image: product.variant_img,
                color: product.color,
                size: product.size,
                sync_variant_id: product.sync_variant_id
            };

            this.data.items.push(prod);
            this.calculateTotals();
        } else {
            this.updateCart([product.id], [qty], true)
        }
    }
    removeFromCart(id = 0) {
        for (let i = 0; i < this.data.items.length; i++) {
            let item = this.data.items[i];
            if (item.id === id) {
                this.data.items.splice(i, 1);
                this.calculateTotals();
            }
        }

    }
    saveCart(request) {
        if (request.session) {
            request.session.cart = this.data;
        }
    }
    emptyCart(request) {
        this.data.items = [];
        this.data.totals = 0;
        if (request.session) {
            request.session.cart.items = [];
            request.session.cart.totals = 0;
        }
        this.calculateTotals();
    }
    updateCart(ids = [], qtys = [], increase = false) {
        let map = [];
        let updated = false;
        for (let id of ids) {
            for (let qty of qtys) {
                map.push({
                    id,
                    qty
                });
            };
        };
        for (let obj of map) {
            for (let item of this.data.items) {
                if (item.id === obj.id) {

                    if (obj.qty > 0 && increase) {
                        item.qty = parseInt(item.qty) + parseInt(obj.qty);
                        updated = true;
                    }
                    else if (obj.qty > 0 && obj.qty !== item.qty) {
                        item.qty = parseInt(obj.qty);
                        updated = true;
                    }
                }
            };
        };
        if (updated) {
            this.calculateTotals();
        }
    }
}

