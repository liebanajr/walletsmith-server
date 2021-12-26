import { config } from '../config'
import { log } from '../logging'
import { ErrorHandler, handleError as errorHandler } from '../error'
import { v4 as uuidv4 } from 'uuid';

var express = require('express');
var path = require('path');
var router = express.Router();
var openssl = require('../openssl')
var fs = require('fs/promises');
var fsSync = require('fs');
var AdmZip = require('adm-zip');

//Endpoint
router.get('/web/:lang?/:section', async (req, res, next) => {
  let params = req.params
  var lang = "en"
  var section = params.section
  if(params.lang) {
    lang = params.lang
  }
  let filename = `${section}-${lang}.html`

  res.sendFile(path.join(__dirname,"../../assets",filename))
})

module.exports = router