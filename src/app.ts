import { config } from './config'
import { log, requestLogger } from './logging'
import { ErrorHandler, handleError as errorHandler } from './error'

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var fileUpload = require('express-fileupload');

var api = require('./api/api-endpoints')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Log request data
app.use(requestLogger)

//Parse json, url parameters and cookies from request
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

//Serve file statically
app.use(express.static(path.join(__dirname, 'public'),{dotfiles:'allow'}))

// compress all responses
app.use(compression())

//Enable file upload
app.use(fileUpload())

//API
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(errorHandler)

global.APP_ROOT = path.resolve(__dirname);

module.exports = app;
