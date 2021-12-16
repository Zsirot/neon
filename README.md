# Neon Noir Band Website and Ecommerce Store

This repository is deployed live at the following URL: http://murmuring-anchorage-12307.herokuapp.com/.

It includes a fully functional ecommerce store with a custom Printful integration (a dropshipping, print-on-demand service)

Currently only set up in a a test environment. Credit card payments via stripe can be tested with the card number 4242 4242 4242 4242, other card fields can be anything

## Features

 -Store API integrations with Printful.com and Stripe
 
 -Shopping cart overlay sidebar
 
 -Automatic MongoDB database seeding from products built in seperately in the Printful store (a very user friendly product design application)
 
 -Automatic store page population from seeded products
 
 -Product seed refresh triggered by printful stock update webhook api
 
 -order details and order submission processed only on successful stripe payment (via payment success stripe webhook)
 

## Prerequisites

 -Node.js
 
 -ejs
 
 -MongoDB
 
 -Bootstrap 5
 
 -A stripe account with a personal stripe webhook key and API key
 
 -A printful acount with a personal API key, and previously created store items
 
 

