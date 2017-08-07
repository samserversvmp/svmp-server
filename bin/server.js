var
    sam = require(__dirname + '/../lib/sam'),
    proxy = require(__dirname + '/../lib/server/proxy'),
    webSocket = require(__dirname + '/../lib/server/websocket');

sam.init();

var port = sam.config.get('port');
var with_tls = sam.config.get('enable_ssl');

webSocket.createServer(undefined,proxy.handleConnection).listen(port);
sam.logger.info('Listening on port %d', port);
if (with_tls) {
    sam.logger.info('SSL is enabled');
} else {
    sam.logger.info('SSL is disabled');
}
