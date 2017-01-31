module.exports = (app, io) => {
	const handyUtils = require('handyutils');
	const redis = require('promise-redis')();
	const client = redis.createClient(process.env.DB_URI+ process.env.DB_Port);
	/*
	LIST ITEMS
	*/
	app.get('/listItems', (req, res) => {
		// get the elements in the shopping-list array
		client.lrange('shopping-list', 0, -1)
		.then(
			answer => {
				console.log(' answer at /listItems',answer);
				res.send({
					'shoppingList':answer,
					'status': 'OK'
				});
			},
			err => {
				console.log(' err at /listItems', err);
				res.send({
					'status': 'FAIL'
				});
			}
		);
	});
	io.of('/shoppingList/')
	.on('connection', (socket) => {
		handyUtils.debug('connection to shopping list feed has been established', '***');
		socket.on('event', (data) => {
			handyUtils.debug('event data:', data);
			// add the new list item to the shopping-list key
			client.lpush('shopping-list', data.listItem)
			.then(
				answer => {
					handyUtils.debug('answer at lpush', answer);
				},
				err => {
			handyUtils.debug('err at lpush', err);
				}
			);

			io.of('/shoppingList/').emit('event', data);
		});
	});
};
