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
        logger.error("Error in OpenSSL process: " + err.toString())
        reject(err.toString());
      }
      hash = buffer.toString().substr(0, 40);
      let ofFileName = path.basename(ofFile)
      logger.debug(ofFileName+"=" + hash + ";");
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
        return logger.error('Unable to scan directory: ' + err);
      }

      var promises = []

      files.forEach(function (file) {
        if (ignoreFiles.includes(file)) {
          logger.debug("Ignoring " + file)
        } else {
          let filePath = path.join(passFolder, file)
          promises.push(SHA1(filePath))
        }
      });

      let manifestPath = path.join(passFolder, "manifest.json")

      Promise.all(promises).then(function (results) {
        for (result of results) {
          let fileName = path.basename(result.ofFile);
          manifest[fileName] = result.hash;
        }
        logger.info("Saving manifest: " + manifestPath);
        logger.debug(JSON.stringify(manifest));
        fs.writeFileSync(manifestPath, JSON.stringify(manifest));
        resolve(passFolder)
      })

    });
  })
}

function generateSignature(forPass) {

  var promise = new Promise(function (resolve, reject) {
    logger.debug("Calculating signature for pass " + forPass);

    let manifest = path.join(forPass, "manifest.json")
    let signature = path.join(forPass, "signature")

    let wwdr = path.join(__dirname, '../certificates/WWDR.pem')
    let cert = path.join(__dirname, '../certificates/passkitTestCert.pem')
    let key = path.join(__dirname, '../certificates/passkitTestKey.pem')

    openssl('openssl smime -binary -sign -certfile ' + wwdr + ' -signer ' + cert + ' -inkey ' + key + ' -in ' + manifest + ' -out ' + signature + ' -outform DER -passin pass:12345', function (err, buffer) {
      let errMessage = err.toString()
      if (errMessage) {
        logger.error("Error in OpenSSL process: " + err.toString())
        reject(err.toString());
      } else {
        logger.info("Saving signature: " + signature);
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
        logger.error('Unable to scan directory: ' + err);
        reject(err)
      }
      var zip = new AdmZip()
      files.forEach(function (file) {
        if (ignoreFiles.includes(file)) {
          logger.debug("Ignoring " + file)
        } else {
          let filePath = path.join(passFolder, file);
          logger.debug("Adding to zip: " + file);
          zip.addLocalFile(filePath);
        }
      });
      let passName = path.basename(passFolder).replace('.pass', '.pkpass')
      let passPath = path.join(passFolder, '..', passName)
      logger.info("Creating pass " + passPath)
      zip.writeZip(passPath)
      resolve(passPath)
    })
  })
  return promise
}

router.post('/generatePass', function (req, res, next) {  
  let receivedPass = req.files.pass
  let receivedPassDest = path.join(passesFolder, receivedPass.name)
  logger.debug("Saving pass to " + receivedPassDest)
  fs.writeFileSync(receivedPassDest, receivedPass.data)

  var zip = new AdmZip(receivedPassDest);
  logger.debug("Extracting pass contents...")
  zip.extractAllTo(passesFolder, true)

  let pass = receivedPassDest.replace('.zip','.pass')

  generateManifest(pass)
  .then(generateSignature)
  .then(compressPass)
  .then(function (passPath) {
    logger.info("Successfully generated " + passPath)
    res.send("Successfully generated " + passPath)
  }).catch(function (err) {
    res.send(err)
  })
});
module.exports = router;
