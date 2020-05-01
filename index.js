var config = require('./config/config.json');
var server = require('./lib/server');

config.PORT = process.env.PORT || config.PORT;

server.run(config);