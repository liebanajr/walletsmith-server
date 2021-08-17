import { config } from '../config'
import { log } from '../logging'
import { ErrorHandler, handleError as errorHandler } from '../error'

var express = require('express');
var path = require('path');
var router = express.Router();
var moment = require('moment');
var openssl = require('openssl-nodejs')
var fs = require('fs');
var AdmZip = require('adm-zip');

function SHA1(ofFile) {
  var hash = "????"
  var promise = new Promise(function (resolve, reject) {
    openssl('openssl sha1 -r ' + ofFile, function (err, buffer) {
      let errMessage = err.toString()
      if (errMessage) {
        log.error("Error in OpenSSL process: " + err.toString())
        reject(err.toString());
      }
      hash = buffer.toString().substr(0, 40);
      let ofFileName = path.basename(ofFile)
      log.debug(ofFileName+"=" + hash + ";");
      resolve({ 'hash': hash, 'ofFile': ofFile });
    })
  });
  return promise;
}

function generateManifest(passFolder) {
  return new Promise(function (resolve, reject) {
    let ignoreFiles = [".DS_Store", "manifest.json", "signature"]

    var manifest = {}

    fs.readdir(passFolder, function (err, files) {
      if (err) {
        return log.error('Unable to scan directory: ' + err);
      }

      var promises = []

      files.forEach(function (file) {
        if (ignoreFiles.includes(file)) {
          log.debug("Ignoring " + file)
        } else {
          let filePath = path.join(passFolder, file)
          promises.push(SHA1(filePath))
        }
      });

      let manifestPath = path.join(passFolder, "manifest.json")

      Promise.all(promises).then(function (results) {
        for (var result of results) {
          let fileName = path.basename(result.ofFile);
          manifest[fileName] = result.hash;
        }
        log.info("Saving manifest: " + manifestPath);
        log.debug(JSON.stringify(manifest));
        fs.writeFileSync(manifestPath, JSON.stringify(manifest));
        resolve(passFolder)
      })

    });
  })
}

function generateSignature(forPass) {

  var promise = new Promise(function (resolve, reject) {
    log.debug("Calculating signature for pass " + forPass);

    let manifest = path.join(forPass, "manifest.json")
    let signature = path.join(forPass, "signature")

    let wwdr = path.join(__dirname, '../certificates/WWDR.pem')
    let cert = path.join(__dirname, '../certificates/walletsmith-test-cert.pem')
    let key = path.join(__dirname, '../certificates/walletsmith-test-key.pem')

    openssl('openssl smime -binary -sign -certfile ' + wwdr + ' -signer ' + cert + ' -inkey ' + key + ' -in ' + manifest + ' -out ' + signature + ' -outform DER -passin pass:12345', function (err, buffer) {
      let errMessage = err.toString()
      if (errMessage) {
        log.error("Error in OpenSSL process: " + err.toString())
        reject(err.toString());
      } else {
        log.info("Saving signature: " + signature);
        resolve(forPass);
      }
    })

  });
  return promise;
}

function compressPass(passFolder) {
  let promise = new Promise(function (resolve, reject) {
    let ignoreFiles = [".DS_Store"]
    fs.readdir(passFolder, function (err, files) {
      if (err) {
        log.error('Unable to scan directory: ' + err);
        reject(err)
      }
      var zip = new AdmZip()
      files.forEach(function (file) {
        if (ignoreFiles.includes(file)) {
          log.debug("Ignoring " + file)
        } else {
          let filePath = path.join(passFolder, file);
          log.debug("Adding to zip: " + file);
          zip.addLocalFile(filePath);
        }
      });
      let passName = path.basename(passFolder).replace('.pass', '.pkpass')
      let passPath = path.join(passFolder, '..', passName)
      log.info("Creating pass " + passPath)
      zip.writeZip(passPath)
      resolve(passPath)
    })
  })
  return promise
}

router.post('/generatePass', function (req, res, next) {  
  let receivedPass = req.files.pass
  let passesFolder = path.join(config.passesFolder, "passes")
  let receivedPassDest = path.join(passesFolder, receivedPass.name)
  log.debug("Saving pass to " + receivedPassDest)
  fs.writeFileSync(receivedPassDest, receivedPass.data)

  var zip = new AdmZip(receivedPassDest);
  log.debug("Extracting pass contents...")
  zip.extractAllTo(passesFolder, true)

  let pass = receivedPassDest.replace('.zip','.pass')

  generateManifest(pass)
  .then(generateSignature)
  .then(compressPass)
  .then(function (passPath) {
    log.info("Successfully generated " + passPath)
    log.info("Sending...")
    res.set("Content-Type", "application/vnd.apple.pkpass")
    res.sendFile(passPath)
  }).catch(function (err) {
    res.send(err)
  })
});
module.exports = router;
