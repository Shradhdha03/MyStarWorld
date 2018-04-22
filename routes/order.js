var express = require('express');
var router = express.Router();
var request = require('request-promise');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var cookie = require('cookie');
router.post('/', (req, res, next) => {
	//Request options and data
	if (req.headers.cookie && cookie.parse(req.headers.cookie).access_token) {
		let shopRequestUrl = 'https://' + process.env.SHOPIFY_SHOP + '/admin/orders.json';
		let shopRequestHeaders = {
			'X-Shopify-Access-Token': cookie.parse(req.headers.cookie).access_token,
		};

		let data = null;
		if (req.body.email) {
			data = {
				"order": {
					"email": req.body.email,
					"fulfillment_status": "fulfilled",
					"send_receipt": true,
					"send_fulfillment_receipt": true,
					"line_items": [{
						variant_id: req.body.variant_id,
						quantity: req.body.quantity
					}]
				}
			}
		} else {
			data = {
				"order": {
					"line_items": [{
						variant_id: req.body.variant_id,
						quantity: req.body.quantity
					}]
				}
			}
		}

		let options = {
			method: 'POST',
			uri: shopRequestUrl,
			json: true,
			headers: shopRequestHeaders,
			body: data
		};

		//Request order
		request.post(options)
			.then((shopResponse) => {

				MongoClient.connect(process.env.MONGO_URL, function (err, db) {

					console.log("Connected correctly to server");

					// Insert a single document
					db.collection('order').insertOne(shopResponse.order, function (err, r) {
						if (err) {
							res.status(500).send(err);
						} else {
							res.redirect(shopResponse.order.order_status_url);
							// res.render('order', {
							// 	order_link: shopResponse.order.order_status_url
							// });
						}
						db.close();
					});
				});
			})
			.catch((error) => {
				res.status(500).send(error);
			});
	} else {
		res.status(500).send("No Token Found");
	}
});
router.get('/list', (req, res, next) => {
	MongoClient.connect(process.env.MONGO_URL, function (err, db) {
		console.log(err);
		db.collection('order').find().toArray(function (err, result) {
			console.log(err);
			if (err) {
				res.status(500).send(err);
			} else {
				console.log(result);
	// res.render('list');
				res.render('list', {
					orders: result
				});
			}
			db.close();
		});
	});
});

module.exports = router;