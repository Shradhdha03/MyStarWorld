var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var cookie = require('cookie');
var nonce = require('nonce')();
var querystring = require('querystring');
var request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const shop = process.env.SHOPIFY_SHOP;
const forwardingAddress = process.env.SHOPIFY_FORWARDING_ADDRESS;
const scopes = process.env.SHOPIFY_SCOPE;


router.get('/', (req, res, next) => {
	if (req.headers.cookie && cookie.parse(req.headers.cookie).access_token) {
		res.render('index');
	} else {
		// Request Token
		if (shop) {
			const state = nonce();
			const redirectUri = forwardingAddress + '/shopify/callback';
			const installUrl = 'https://' + shop +
				'/admin/oauth/authorize?client_id=' + apiKey +
				'&scope=' + scopes +
				'&state=' + state +
				'&redirect_uri=' + redirectUri;
			res.cookie('state', state);
			res.redirect(installUrl);
		} else {
			return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
		}
	}
});

router.get('/shopify/callback', (req, res, next) => {
	const {
		shop,
		hmac,
		code,
		state
	} = req.query;
	const stateCookie = cookie.parse(req.headers.cookie).state;

	if (state !== stateCookie) {
		return res.status(403).send('Request origin cannot be verified');
	}

	if (shop && hmac && code) {
		//Validate request is from Shopify
		const map = Object.assign({}, req.query);
		delete map['signature'];
		delete map['hmac'];
		const message = querystring.stringify(map);
		const providedHmac = Buffer.from(hmac, 'utf-8');
		const generatedHash = Buffer.from(
			crypto
			.createHmac('sha256', apiSecret)
			.update(message)
			.digest('hex'),
			'utf-8'
		);
		let hashEquals = false;

		try {
			hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
		} catch (e) {
			hashEquals = false;
		};

		if (!hashEquals) {
			return res.status(400).send('HMAC validation failed');
		}

		const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
		const accessTokenPayload = {
			client_id: apiKey,
			client_secret: apiSecret,
			code,
		};

		request.post(accessTokenRequestUrl, {
				json: accessTokenPayload
			})
			.then((accessTokenResponse) => {
				res.cookie('access_token', accessTokenResponse.access_token);
				res.redirect(forwardingAddress);
			})
			.catch((error) => {
				res.status(500).send(error);
			});

	} else {
		res.status(400).send('Required parameters missing');
	}

});
module.exports = router;