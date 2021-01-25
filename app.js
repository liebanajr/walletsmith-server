var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var compression = require('compression');
var winston = require('winston');
var expressWinston = require('express-winston');
var winstonRolling = require('winston-daily-rotate-file');
var fileUpload = require('express-fileupload');

var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Setup request loger
var requestLogger = expressWinston.logger({
      transports: [
        LOGGER.logFileTransport,
        LOGGER.errorFileTransport
      ],
      meta: true,
      format: LOGGER.format
});

//Console output if on dev environment
if(CONFIG.env == "dev") {
  var consoleRequestLogger = expressWinston.logger({
        transports: [
          LOGGER.consoleTransport
        ],
        meta: true, // optional: control whether you want to log the meta data about the request (default to true)
        format: LOGGER.format
  });
  app.use(consoleRequestLogger);
}

app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'),{dotfiles:'allow'}));

// compress all responses
app.use(compression())

//Enable file upload
app.use(fileUpload())

//RUTAS DEFINIDAS PARA FUNCIONALIDAD PERSONALIZADA
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  logger.error(err);
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
