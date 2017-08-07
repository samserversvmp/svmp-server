/**
 * Main namespace object used through-out the app.
 *
 * @exports sam
 */
var sam = {};

module.exports = sam;

/**
 * Current version used. Read from package.json
 * @type {String}
 */
sam.VERSION = require('../package.json').version;

/**
 * Called at start of App.  Initializes the core modules
 */
sam.init = function(configFile) {

    /**** Setup ****/

    // Winston and wrap in out global name space
    sam.logger = require('./common/logger');
    sam.logger.beforeConfig();

    sam.logger.info('Starting sam-server version %s', sam.VERSION);

    // Config with validation
    sam.config = require('./common/config');
    sam.config.init(configFile);

    sam.logger.afterConfig();

    // Protocol
    sam.protocol = require('./server/protocol');
    sam.protocol.init();

    // Models
    sam.vmSession = require('./model/vm-session');

    // Overseer Client
    var client = require('svmp-overseer-client');
    sam.overseerClient = new client(sam.config.get('overseer_url'), sam.config.get('auth_token'));
};

/**
 * Shut down. Closes DB connection and cleans up any temp config settings
 */
sam.shutdown = function() {
    sam.config.reset();
}
