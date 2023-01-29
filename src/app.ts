import { log, requestLogger } from './logging'
import { handleError as errorHandler } from './error'
const promBundle = require("express-prom-bundle");
const metricsMiddleware = promBundle({includeMethod: true, includePath: true})

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var fileUpload = require('express-fileupload');

var passGenerator = require('./api/pass-generator')
var barcodeGenerator = require('./api/barcode-generator')
var web = require('./web/web')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Request metrics
app.use(metricsMiddleware);

//Log request data
app.use(requestLogger)

//Parse json, url parameters and cookies from request
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

//Serve file statically
const staticPath = path.join(__dirname, '../public')
log.info(`Serving static files from: ${staticPath}`)
app.use(express.static(staticPath,{dotfiles:'allow'}))

// compress all responses
app.use(compression())

//Enable file upload
app.use(fileUpload())

//API
app.use(passGenerator)
app.use(barcodeGenerator)

//WEB
app.use(web)

//Test ok status
app.use('/api/health', (req, res, next) => {
  res.send("OK")
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(errorHandler)

global.APP_ROOT = path.resolve(__dirname);

module.exports = app;
