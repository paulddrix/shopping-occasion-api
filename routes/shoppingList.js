module.exports = (app, io) => {
	const handyUtils = require('handyutils');
	const randomize = require('randomatic');
	const redis = require('promise-redis')();
	const connectOpts = {
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		password: process.env.DB_PASS
	};
	const client = redis.createClient(connectOpts);
	const statusControl = redis.createClient(connectOpts);
	// reference of the API, could be an environmental variable
	const API_IDENTIFIER = randomize('aA0',10);
	/*
	LIST ITEMS
	*/
	app.get('/listItems', (req, res) => {
		// get the elements in the shopping-list array
		client.lrange('shopping-list', 0, -1)
		.then(
			answer => {
				console.log(' answer at /listItems', answer);
				res.send({
					'shoppingList': answer,
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
	// log when api subscribes to a channela and how many subscribers it has
	statusControl.on("subscribe", function (channel, count) {
		console.log(`-*- channel: ${channel}, count: ${count}`);
	});
	// here is where the api gets to know whether it will modify the db or just send the
	// modification to the view layer
	statusControl.on("message", function (channel, message) {
			console.log(`-*- sub channel: ${channel}`);
			console.log(`message: `, message);
			// here we have a conditional to check if the API that published a change is the current one.
			// if so, then that API gets to add or remove item from db.
			// else, the current API will only send the data to the view layer.

			//get a reference of the parsed message obj
			let parsedMessage = JSON.parse(message);
			console.log('parsedMessage: ', parsedMessage);
			if (parsedMessage.createdBy === API_IDENTIFIER) {
				console.log('it is created by this api!');
				if (parsedMessage.text && parsedMessage.action != 'remove') {
					// push the item into the db
					client.lpush('shopping-list', message)
					.then(
						answer => {
							handyUtils.debug('answer at lpush', answer);
						},
						err => {
					handyUtils.debug('err at lpush', err);
						}
					);
					// send it to the view layer so that it can be updated there.
					io.of('/shoppingList/').emit('event', message);
				} else if (parsedMessage.action === 'remove') {
					// reference for the object to remove
					let listItemObj = {};
					listItemObj.text = parsedMessage.text;
					listItemObj.itemId = parsedMessage.itemId;
					listItemObj.createdBy = parsedMessage.createdBy;
					let stringlistItemObj= JSON.stringify(listItemObj);
					handyUtils.debug('item to remove',stringlistItemObj);
					handyUtils.debug('item to remove typeof', typeof stringlistItemObj);
					client.lrem('shopping-list', 0, stringlistItemObj)
					.then(
						answer => {
							handyUtils.debug('answer at lrem', answer);
						},
						err => {
					handyUtils.debug('err at lrem', err);
						}
					);
				}
				// if the action is remove but it was not created by this API, simply send it to the view layer
			} else if(parsedMessage.action === 'remove' && parsedMessage.createdBy === API_IDENTIFIER) {
				io.of('/shoppingList/').emit('event', message);
			} else {
				// if it is not created by this API and it is not a remove, simply send the data to the view layer
				io.of('/shoppingList/').emit('event', message);
			}
	});

	io.of('/shoppingList/')
	.on('connection', (socket) => {
		handyUtils.debug('connection to shopping list feed has been established', '***');

		socket.on('event', (data) => {
			handyUtils.debug('event data:', data);
			// stringify before it is published
			let dataForStatusControl = {};
			// check if a remove event is incoming
			// if so, add the action and the itemId and createdBy field
			// otherwise generate an itemId and createdBy fields for it
			if (data.action ) {
				dataForStatusControl.action = data.action;
				dataForStatusControl.itemId = data.itemId;
				dataForStatusControl.createdBy = data.createdBy;
			} else{
				dataForStatusControl.itemId = randomize('0', 10);
				dataForStatusControl.createdBy = API_IDENTIFIER;
			}
			dataForStatusControl.text = data.text;
			// make the object into a string to publish
			let stringdataForStatusControl= JSON.stringify(dataForStatusControl);
			client.publish("shopping_list", stringdataForStatusControl)
			.then(
				answer => {
					handyUtils.debug('answer at publish', answer);
				},
				err => {
			handyUtils.debug('err at publish', err);
				}
			);
		});
	});
	// subscribe the StatusControl connection to he shopping list channel
	statusControl.subscribe("shopping_list");
};
