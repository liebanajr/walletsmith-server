import { config } from '../config'
import { log } from '../logging'
import { ErrorHandler, handleError as errorHandler } from '../error'

var express = require('express');
var path = require('path');
var router = express.Router();
var openssl = require('openssl-nodejs')
var fs = require('fs/promises');
var AdmZip = require('adm-zip');

//Endpoint
router.post('/generatePass', async (req, res, next) => {
  let receivedPass = req.files.pass
  let passesFolder = path.join(config.passesFolder, "passes")
  let receivedPassDest = path.join(passesFolder, receivedPass.name)
  log.debug("Saving pass to " + receivedPassDest)

  await fs.writeFile(receivedPassDest, receivedPass.data)

  var zip = new AdmZip(receivedPassDest);
  log.debug("Extracting pass contents...")
  zip.extractAllTo(passesFolder, true)

  let pass = receivedPassDest.replace('.zip', '.pass')

  await PassManager.generateManifest(pass)
  PassManager.generateSignature(pass)
  const compressedPassPath = await PassManager.compressPass(pass)
  log.info("Successfully generated " + compressedPassPath)
  log.info("Sending...")
  res.set("Content-Type", "application/vnd.apple.pkpass")
  res.sendFile(compressedPassPath)

})

module.exports = router

//Pass generation
class PassManager {


  static SHA1(ofFile): any {
    var hash = "????"
    openssl('openssl sha1 -r ' + ofFile, function (err, buffer) {

      if (err) {
        const msg = "Error in OpenSSL process: " + err.toString()
        throw new ErrorHandler(500, msg)
      }

      hash = buffer.toString().substr(0, 40)
      let ofFileName = path.basename(ofFile)
      log.debug(ofFileName + "=" + hash + ";")

      return {
        "hash": hash,
        "ofFile": ofFile
      }
    })
  }

  static async generateManifest(passFolder: string): Promise<String> {

    const ignoreFiles = [".DS_Store", "manifest.json", "signature"]

    var manifest = {}

    const files = await fs.readdir(passFolder)

    files.forEach(function (file) {
      if (ignoreFiles.includes(file)) {
        log.debug("Ignoring " + file)
      } else {
        let filePath = path.join(passFolder, file)
        const sha = PassManager.SHA1(filePath)

        const fileName = path.basename(sha.ofFile)
        manifest[fileName] = sha.hash

      }
    })

    const manifestPath = path.join(passFolder, "manifest.json")

    log.info("Saving manifest: " + manifestPath)
    log.debug(JSON.stringify(manifest))
    fs.writeFileSync(manifestPath, JSON.stringify(manifest))

    return passFolder

  }

  static generateSignature(forPass: string): string {

    log.debug("Calculating signature for pass " + forPass)

    let manifest = path.join(forPass, "manifest.json")
    let signature = path.join(forPass, "signature")

    let wwdr = path.join(__dirname, '../certificates/WWDR.pem')
    let cert = path.join(__dirname, '../certificates/walletsmith-test-cert.pem')
    let key = path.join(__dirname, '../certificates/walletsmith-test-key.pem')

    openssl('openssl smime -binary -sign -certfile ' + wwdr + ' -signer ' + cert + ' -inkey ' + key + ' -in ' + manifest + ' -out ' + signature + ' -outform DER -passin pass:12345', function (err, buffer) {
      if (err) {
        throw err
      } else {
        log.debug("Saving signature: " + signature);
        return forPass
      }
    })

    return null

  }

  static async compressPass(passFolder: string) {

    const ignoreFiles = [".DS_Store"]

    const files = await fs.readdir(passFolder)

    var zip = new AdmZip()
    files.forEach(function (file) {
      if (ignoreFiles.includes(file)) {
        log.debug("Ignoring " + file)
      } else {
        let filePath = path.join(passFolder, file)
        log.debug("Adding to zip: " + file)
        zip.addLocalFile(filePath)
      }
    });
    let passName = path.basename(passFolder).replace('.pass', '.pkpass')
    let passPath = path.join(passFolder, '..', passName)
    log.info("Creating pass " + passPath)
    zip.writeZip(passPath)

    return passPath
  }

}
