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
var nodemailer = require('nodemailer');

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

router.post('/web/:lang?/support/send-email', async (req, res, next) => {
  log.info(`Sending email: ${JSON.stringify(req.body)}`)
  let params = req.params
  var lang = "en"
  if(params.lang) {
    lang = params.lang
  }
  let filename = `support-ok-${lang}.html`
  res.sendFile(path.join(__dirname,"../../assets",filename))

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER ,
      pass: process.env.MAIL_PASSWORD
    }
    });

    var mailOptions = {
      from: process.env.MAIL_USER,
      to: "walletsmith@liebanajr.com",
      subject: "Walletsmith Support",
      text: `From: ${req.body.email}\nMessage:\n${req.body.message}`
    };
  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        log.error(error);
      } else {
        log.info('Email sent:' + info.response);
      }
    });

})

module.exports = router