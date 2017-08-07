var
    sam = require('./../sam'),
    nconf = require('nconf'),
    yaml = require('js-yaml'),
    path = require('path'),
    revalidator = require('revalidator'),
    schema = require('../../config/schema'),
    defaultConfig = require('./default-config')
    fs = require('fs');


module.exports = nconf;

nconf.init = function (configFile) {
    sam.config.argv().env();

    // config file priority:
    // 1) passed into init by argument (only used by tests)
    // 2) command line arg or env var
    // 3) default config/config-local.yaml

    configFile = typeof configFile !== 'undefined' ? configFile : sam.config.get("config");

    if (typeof configFile === 'undefined') {
        // neither 1 or 2 was specified, try the default
        configFile = __dirname + '/../../config/config-local.yaml';
    }
    if (!fs.existsSync(configFile)) {
        sam.logger.error('Config file does not exist: %s', configFile);
        process.exit(1);
    }

    sam.logger.info('Loading config file: %s', configFile);

    sam.config.file({
        file: configFile,
        format: {
            parse: yaml.safeLoad,
            stringify: yaml.safeDump
        }
    });
    sam.config.defaults(defaultConfig);

    // Validate config against schema
    var validation = revalidator.validate(sam.config.stores.file.store, schema);
    if (!validation.valid) {
        validation.errors.forEach(function(e) {
            sam.logger.error('Error parsing config file: %s %s', e.property, e.message);
        });
        process.exit(1);
    } else {
            sam.config.configTls();
            sam.config.configOverseer();
    }
};


/**
 * Is the given key enabled (true or false?)
 * @param key
 * @returns {boolean}
 */
nconf.isEnabled = function (key) {
    return sam.config.get(key) === true;
};

/**
 * Is the given key disabled?
 * @param key
 * @returns {boolean}
 */
nconf.isDisabled = function (key) {
    return sam.config.get(key) === false;
};

/**
 * Use TLS certification authentication?
 * @returns {*}
 */
nconf.useTlsCertAuth = function () {
    return sam.config.get("enable_ssl") && sam.config.get("cert_user_auth");
};

/**
 * Configure this TLS information.
 */
nconf.configTls = function () {
    if (sam.config.isEnabled('enable_ssl')) {
        var privateKeyPath = sam.config.get('private_key');
        var certFilePath = sam.config.get('server_certificate');
        var passPhrase = sam.config.get('private_key_pass');

        var options = {};

        try {
            var tls_key = fs.readFileSync(privateKeyPath);
        } catch (err) {
            sam.logger.error("Could not open TLS private key '%s'", privateKeyPath);
            process.exit(1);
        }
        try {
            var tls_cert = fs.readFileSync(certFilePath);
        } catch (err) {
            sam.logger.error("Could not open TLS certificate '%s'", certFilePath);
            process.exit(1);
        }
        options.type = 'tls';
        options.key = tls_key;
        options.passphrase = passPhrase;
        options.cert = tls_cert;
        options.honorCipherOrder = true;
        options.ciphers =
            "AES128-SHA:" +                    // TLS_RSA_WITH_AES_128_CBC_SHA
            "AES256-SHA:" +                    // TLS_RSA_WITH_AES_256_CBC_SHA
            "AES128-SHA256:" +                 // TLS_RSA_WITH_AES_128_CBC_SHA256
            "AES256-SHA256:" +                 // TLS_RSA_WITH_AES_256_CBC_SHA256
            "ECDHE-RSA-AES128-SHA:" +          // TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA
            "ECDHE-RSA-AES256-SHA:" +          // TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA
            "DHE-RSA-AES128-SHA:" +            // TLS_DHE_RSA_WITH_AES_128_CBC_SHA, should use at least 2048-bit DH
            "DHE-RSA-AES256-SHA:" +            // TLS_DHE_RSA_WITH_AES_256_CBC_SHA, should use at least 2048-bit DH
            "DHE-RSA-AES128-SHA256:" +         // TLS_DHE_RSA_WITH_AES_128_CBC_SHA256, should use at least 2048-bit DH
            "DHE-RSA-AES256-SHA256:" +         // TLS_DHE_RSA_WITH_AES_256_CBC_SHA256, should use at least 2048-bit DH
            "ECDHE-ECDSA-AES128-SHA256:" +     // TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256, should use elliptic curve certificates
            "ECDHE-ECDSA-AES256-SHA384:" +     // TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384, should use elliptic curve certificates
            "ECDHE-ECDSA-AES128-GCM-SHA256:" + // TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256, should use elliptic curve certificates
            "ECDHE-ECDSA-AES256-GCM-SHA384:" + // TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384, should use elliptic curve certificates
            "@STRENGTH";                       // sort ciphers by strength (descending order)
        options.requestCert = false;

        if (sam.config.isEnabled('cert_user_auth')) {
            var cacertPath = sam.config.get('ca_cert');

            try {
                options.ca = [ fs.readFileSync(cacertPath) ];
            } catch (err) {
                sam.logger.error("Could not open TLS ca cert file '%s'", cacertPath);
                process.exit(1);
            }

            options.requestCert = true;
        }

        sam.config.set('tls_options', options);

        // if we don't set this, the server rejects client connections with an "UNABLE_TO_VERIFY_LEAF_SIGNATURE" error
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
};

/**
 * Configure the Overseer information.
 */
nconf.configOverseer = function () {
    var overseerCertPath = sam.config.get('overseer_cert');

    // attempt to read sam Overseer certificate (used to decode JWTs)
    try {
        var overseerCert = fs.readFileSync(overseerCertPath, 'utf8');
        sam.config.set('overseerCert', overseerCert);
    } catch (err) {
        sam.logger.error("Could not open overseer cert file '%s'", overseerCertPath);
        process.exit(1);
    }
};

nconf.getVideoResponse = function() {
    // Stringify parameters
    var ice = JSON.stringify(sam.config.get('webrtc:ice_servers'));
    var video = JSON.stringify(sam.config.get('webrtc:video'));
    var pc = JSON.stringify(sam.config.get('webrtc:pc'));

    return { iceServers: ice, pcConstraints: pc, videoConstraints: video };
};

/**
 * Gets a JSON object with the common REST API parameters
 * @returns {}
 */
nconf.getRestParams = function (path, method, body) {
    var value = {
        'url': sam.config.get('overseer_url') + path,
        'headers': {
            'sam-authtoken': sam.config.get('auth_token')
        },
    };

    // if the method is defined, set it (otherwise it defaults to 'GET')
    if (method) {
        value.method = method;
    }

    // if we are sending a JSON object in the body, configure the params appropriately
    if (body) {
        var bodyString = JSON.stringify(body);
        value.body = [bodyString];
        value.headers['Content-Type'] = 'application/json';
        value.headers['Content-Length'] = Buffer.byteLength(bodyString, 'utf8');
    }

    return value;
}
