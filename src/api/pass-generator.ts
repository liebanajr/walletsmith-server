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

//Endpoints
router.post('/api/signPass', async (req, res, next) => {
  try {
    await PassManager.removeStoredPasses()
    let cert = req.body.cert
    var manifest = JSON.parse(req.body.manifest)
    let fileBaseName = uuidv4()
    let passesFolder = path.join(__dirname,"../..","./tmp", "passes")
    let dataFolder = path.join(passesFolder, fileBaseName)
    await fs.mkdir(dataFolder, { recursive: true })
    let manifestPath = path.join(dataFolder, "manifest.json")
    let signaturePath = path.join(dataFolder, "signature")
    log.debug("Saving manifest:"+manifestPath)
    await fs.writeFile(manifestPath, JSON.stringify(manifest))
    let pwd = config.passSignPwd
    if(!pwd) throw new Error("No pass signing password defined")
    let signature = await PassManager.signPass(cert, pwd, manifestPath, signaturePath)
    if(!signature) {
      res.status(500).send("Error signing pass")
    } else {
      log.info("Sending...")
      res.sendFile(signaturePath)
    }
    log.debug("Removing data...")
    await fs.rm(dataFolder, {force:true,recursive:true})
  } catch (err) {
    log.error("ERROR")
    log.error(err)
    res.status(500).send("Error signing pass: " + err)
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

  static async generateSignature(forPass: string): Promise<string> {

    return await PassManager.signPass("walletsmith-test", config.passSignPwd, path.join(forPass, "manifest.json"), path.join(forPass, "signature"))

  }

  static async signPass(withCert: string, certPassword: string, manifest: string, signaturePath: string): Promise<string | undefined> {

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

      openssl(`openssl smime -md md5 -binary -sign -certfile ${wwdr} -signer ${cert} -inkey ${key} -in ${manifest} -out ${signaturePath} -outform DER -passin pass:${certPassword}`, function (err, buffer) {
        if (err.toString()) {
          log.error("Error generating signature -> " + err.toString())
          resolve(undefined)
        } else {
          log.debug("Generated signature.")
          resolve(buffer)
        }
      })

    })

  }

  static async removeStoredPasses() {
    let passesFolder = path.join(__dirname,"../..","./tmp", "passes")
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
