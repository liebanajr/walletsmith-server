import { config } from '../config'
import { log } from '../logging'
import { ErrorHandler, handleError as errorHandler } from '../error'

var express = require('express');
var path = require('path');
var router = express.Router();
var openssl = require('../openssl')
var fs = require('fs/promises');
var fsSync = require('fs');
var AdmZip = require('adm-zip');

//Endpoint
router.post('/api/generatePass', async (req, res, next) => {
  try {
    await PassManager.removeStoredPasses()
    let receivedPass = req.files.pass
    let passesFolder = path.join(__dirname,"../..",config.passesFolder, "passes")
    let receivedPassDest = path.join(passesFolder, receivedPass.name)
    log.debug("Saving pass to " + receivedPassDest)

    await fs.writeFile(receivedPassDest, receivedPass.data)

    var zip = new AdmZip(receivedPassDest);
    log.debug("Extracting pass contents...")
    zip.extractAllTo(passesFolder, true)

    let pass = receivedPassDest.replace('.zip', '.pass')

    await PassManager.generateManifest(pass)
    await PassManager.generateSignature(pass)
    const compressedPassPath = await PassManager.compressPass(pass)
    log.info("Successfully generated " + compressedPassPath)
    log.info("Sending...")
    res.set("Content-Type", "application/vnd.apple.pkpass")
    res.sendFile(compressedPassPath)
  } catch (err) {
    log.error(err)
    next(err)
  }
})

router.post('/api/signPass', async (req, res, next) => {
  try {
    await PassManager.removeStoredPasses()
    let cert = req.body.cert.passTypeIdentifier
    let manifest = req.body.manifest

    let signature = await PassManager.signPass(cert, "12345", manifest)

    log.info("Sending...")
    res.set("Content-Type", "text/plain")
    res.send(signature)
  } catch (err) {
    log.error(err)
    next(err)
  }
})

module.exports = router

//Pass generation
class PassManager {


  static async SHA1(ofFile): Promise<any> {
    return new Promise((resolve, reject) => {
      var hash = "????"
      openssl('openssl sha1 -r ' + ofFile, async (err, buffer) => {

        if (err.toString()) {
          const msg = "Error in OpenSSL process: " + err.toString()
          throw new ErrorHandler(500, msg)
        }

        hash = buffer.toString().substr(0, 40)
        let ofFileName = path.basename(ofFile)
        log.silly(ofFileName + "=" + hash + ";")

        resolve({
          "hash": hash,
          "ofFile": ofFile
        })
      })
    })
  }

  static async generateManifest(passFolder: string): Promise<String> {

    const ignoreFiles = [".DS_Store", "manifest.json", "signature"]

    var manifest = {}

    const files = await fs.readdir(passFolder)

    for(const file of files) {
      if (ignoreFiles.includes(file)) {
        log.debug("Ignoring " + file)
      } else {
        let filePath = path.join(passFolder, file)
        const sha = await PassManager.SHA1(filePath)
        const fileName = path.basename(sha.ofFile)
        manifest[fileName] = sha.hash

      }
    }

    const manifestPath = path.join(passFolder, "manifest.json")

    log.info("Saving manifest: " + manifestPath)
    log.debug(JSON.stringify(manifest))
    await fs.writeFile(manifestPath, JSON.stringify(manifest))

    return passFolder

  }

  static async generateSignature(forPass: string): Promise<string> {

    return new Promise((resolve, reject) => {
      log.debug("Calculating signature for pass " + forPass)

      let manifest = path.join(forPass, "manifest.json")
      let signature = path.join(forPass, "signature")

      let wwdr = path.join(__dirname, '../../certificates/WWDR.pem')
      log.debug(`wwdr path='${wwdr}'`)
      fsSync.readFileSync(wwdr)
      let cert = path.join(__dirname, '../../certificates/walletsmith-test-cert.pem')
      log.debug(`cert path='${cert}'`)
      fsSync.readFileSync(cert)
      let key = path.join(__dirname, '../../certificates/walletsmith-test-key.pem')
      log.debug(`key path='${key}'`)
      fsSync.readFileSync(key)

      openssl('openssl smime -binary -sign -certfile ' + wwdr + ' -signer ' + cert + ' -inkey ' + key + ' -in ' + manifest + ' -out ' + signature + ' -outform DER -passin pass:12345', function (err, buffer) {
        if (err.toString()) {
          throw new ErrorHandler(500, "Error generating signature -> " + err.toString())
        } else {
          log.debug("Saving signature: " + signature);
          resolve(forPass)
        }
      })

    })

  }

  static async signPass(withCert: string, certPassword: string, manifest: object): Promise<string> {

    return new Promise((resolve, reject) => {
      log.debug("Calculating signature for passType " + withCert)

      let wwdr = path.join(__dirname, '../../certificates/WWDR.pem')
      log.debug(`wwdr path='${wwdr}'`)
      fsSync.readFileSync(wwdr)
      let cert = path.join(__dirname, `../../certificates/${withCert}-cert.pem`)
      log.debug(`cert path='${cert}'`)
      fsSync.readFileSync(cert)
      let key = path.join(__dirname, `../../certificates/${withCert}-key.pem`)
      log.debug(`key path='${key}'`)
      fsSync.readFileSync(key)

      openssl('openssl smime -binary -sign -certfile ' + wwdr + ' -signer ' + cert + ' -inkey ' + key + ' -in ' + manifest + ' -outform DER -passin pass:' + certPassword, function (err, buffer) {
        if (err.toString()) {
          throw new ErrorHandler(500, "Error generating signature -> " + err.toString())
        } else {
          log.debug("Generated signature: " + buffer);
          resolve(buffer)
        }
      })

    })

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

  static async removeStoredPasses() {
    let passesFolder = path.join(__dirname,"../..",config.passesFolder, "passes")
    try {
      const files = await fs.readdir(passesFolder);
      for (const file of files) {
        const filePath = path.join(passesFolder, file);
        log.debug(`Removing existing pass: ${filePath}`)
        await fs.rm(filePath, {force:true,recursive:true})
      }
    } catch (err) {
      log.error(err);
    }
  }

}
