#!/usr/bin/env node
import { config } from './config'
import { log } from './logging'

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
  const privateKey = fs.readFileSync(config.httpsKeyPath, 'utf8');
  const certificate = fs.readFileSync(config.httpsCertPath, 'utf8');
  const options = {
    key: privateKey,
    cert: certificate
  };

  server = https.createServer(options, app);

  server.listen(port);
  log.info("HTTPS server listening on port " + port);
  server.on('error', onError);
  server.on('listening', function () {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
  });

} catch (err) {
  log.warn("Error starting https server: " + err.message);
  log.warn("Starting HTTP server instead");

  var httpPort = normalizePort(process.env.HTTP_PORT || config.httpPort);
  app.set('port', httpPort);
  var httpServer = http.createServer(app);
  httpServer.listen(httpPort);
  log.info("HTTP server listening on port " + httpPort);
  httpServer.on('error', onError);
  httpServer.on('listening', function () {
    var addr = httpServer.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    log.debug('Listening on ' + bind);
  });
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
      break;
    default:
      throw error;
  }
}
