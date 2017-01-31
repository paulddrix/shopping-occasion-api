// Modules
const express = require('express');
const app = express();
const handyUtils = require('handyutils');
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(http);
// Dot Env File Loader
if (!process.env.PORT) {
  require('dotenv').load();
}
// =-=-=-=-=-=-=-=-=-= Config vars =-=-=-=-=-=-=-=-=-=-=-=
// Configuring CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = process.env.PORT || 8988;
// =-=-=-=-=-=-=-=-=-= Routes =-=-=-=-=-=-=-=-=-=-=-=-=-=-=
require('./routes/shoppingList')(app, io);
/**
 * The Server Module that launches the API. Usable by other services like in unit testing.
 * @module Start/Server
 */
exports.server = http.listen(port, () => {
  handyUtils.debug('Server Active On Port', port);
});
