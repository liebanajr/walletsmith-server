#!/usr/bin/env node

/**
 * Module dependencies.
 */
var debug = require('debug')('app:server');
var https = require('https');
var http = require('http');
const fs = require('fs');
var winston = require('winston');
var winstonRolling = require('winston-daily-rotate-file');
const { networkInterfaces } = require('os');



/**
 * Get port from environment and store in Express.
 */
global.CONFIG = JSON.parse(fs.readFileSync('config.json'));
CONFIG.dbhost = process.env.DB_HOST || CONFIG.dbhost;
CONFIG.dbuser = process.env.DB_USER || CONFIG.dbuser;
CONFIG.dbpassword = process.env.DB_PASSWORD || CONFIG.dbpassword;
CONFIG.dbname = process.env.DB_NAME || CONFIG.dbname;

//Set server logger
global.LOGGER = {};
LOGGER.format = winston.format.combine(
  winston.format.label({
    label : CONFIG.appName
  }),
  winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
  winston.format.printf(info => {
    return info.timestamp + ' - ' + info.label + ' - [' + info.level + ']: ' + info.message;
  })
);
LOGGER.logFileTransport = new winston.transports.DailyRotateFile({
    filename: './logs/' + CONFIG.appName + '-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '7d'
});
LOGGER.errorFileTransport = new winston.transports.DailyRotateFile({
    filename: './logs/' + CONFIG.appName + '-stderr-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '7d',
    level : 'warn'
});
LOGGER.consoleTransport = new winston.transports.Console({level:'debug'});

global.logger = winston.createLogger({
    transports: [
      LOGGER.logFileTransport,
      LOGGER.errorFileTransport
    ],
    format: LOGGER.format
  });

if(CONFIG.env == "dev") {
  logger.add(LOGGER.consoleTransport);
} else {
  fs.writeFileSync("pid.txt", process.pid);
}

/**
* APP & SERVER SETUP
*/
var app = require('../app');
var httpApp = require('../app');

var server;
var port;
try {

  port = normalizePort(process.env.PORT || CONFIG.port);
  app.set('port', port);
  /**
   * Create HTTPS server.
   */
   const privateKey = fs.readFileSync(CONFIG.httpsKeyPath, 'utf8');
   const certificate = fs.readFileSync(CONFIG.httpsCertPath, 'utf8');
   const options = {
    key: privateKey,
    cert: certificate
  };

  server = https.createServer(options, app);

  server.listen(port);
  logger.info(CONFIG.appName + " HTTPS server listening on port " + port);
  server.on('error', onError);
  server.on('listening', function () {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
  });

} catch(err){
  console.error("Error starting https server: " + err.message);
  logger.warn("Error starting https server: " + err.message);
}

var httpPort = normalizePort(process.env.HTTP_PORT || CONFIG.httpPort);
httpApp.set('port', httpPort);
var httpServer = http.createServer(httpApp);

httpServer.listen(httpPort);
logger.info(CONFIG.appName + " HTTP server listening on port " + httpPort);
httpServer.on('error', onError);
httpServer.on('listening', function () {
  var addr = httpServer.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
});

const nets = networkInterfaces();
const netsResults = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!netsResults[name]) {
                netsResults[name] = [];
            }
            netsResults[name].push(net.address);
        }
    }
}
logger.debug("IP="+netsResults.en0)
/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}
