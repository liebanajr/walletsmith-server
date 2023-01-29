#!/usr/bin/env node
import { config } from './config'
import { log } from './logging'

/**
 * Module dependencies.
 */
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

/**
* APP & SERVER SETUP
*/
var app = require('./app');

var server;
var port;
try {

  port = normalizePort(config.port);
  app.set('port', port);
  /**
   * Create HTTPS server.
   */
  app.set('port', port);
  var httpServer = http.createServer(app);
  httpServer.listen(port);
  log.info("HTTP server listening on port " + port);
  httpServer.on('error', onError);
  httpServer.on('listening', function () {
    var addr = httpServer.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    log.debug('Listening on ' + bind);
  });

} catch (err) {
  log.warn("Error starting HTTP server: " + err.message);
  throw err
}

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
      log.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      log.error(bind + ' is already in use');
      process.exit(1);
    default:
      throw error;
  }
}
