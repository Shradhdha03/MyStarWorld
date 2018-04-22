var express = require('express');
var router = express.Router();
var request = require('request-promise');
var cookie = require('cookie');
router.get('/', (req, res, next) => {
    if (req.headers.cookie && cookie.parse(req.headers.cookie).access_token) {
        let shopRequestUrl = 'https://' + process.env.SHOPIFY_SHOP + '/admin/products.json';
        let shopRequestHeaders = {
            'X-Shopify-Access-Token': cookie.parse(req.headers.cookie).access_token,
        };

        //Request product
        request.get(shopRequestUrl, {
                headers: shopRequestHeaders
            })
            .then((shopResponse) => {
                let products = JSON.parse(shopResponse).products;
                res.render('product', {
                    products: products
                });
            })
            .catch((error) => {
                res.status(500).send(error);
            });
    } else {
        res.status(500).send("No Token Found");
    }
});

module.exports = router;