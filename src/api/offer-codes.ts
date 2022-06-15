import { log } from '../logging'

var express = require('express');
var path = require('path');
var router = express.Router();
var fs = require('fs/promises');

//Endpoint
router.get('/api/offer-code', async (req, res, next) => {
  try {
    let code = req.query.code
    if(!code) {
      let message = `No code in request`
      log.error(message)
      res.status(400).send(message)
      return
    }
    let availableCodesPath = path.join(__dirname,"../../assets","offer-codes.json")
    let availableCodes
    try {
      let data = await fs.readFile(availableCodesPath, 'utf8')
      availableCodes = JSON.parse(data)
    } catch(err) {
      let message = `No available codes: ${err as Error}`
      log.error(message)
      res.status(500).send(message)
      return
    }
    if(!availableCodes) {
      let message = `No available codes`
      log.error(message)
      res.status(500).send(message)
      return
    }
    log.debug(`Available codes: ${JSON.stringify(availableCodes)}`)
    let requestedCode = availableCodes[code]
    if(!requestedCode) {
      let message = `No available code for requested code '${code}'`
      log.error(message)
      res.status(200).json({})
      return
    }
    log.info(`Found code '${code}': ${JSON.stringify(requestedCode)}`)
    res.json(requestedCode)
    availableCodes[code].isAlreadyUsed = true
    await fs.writeFile(availableCodesPath, JSON.stringify(availableCodes))
  } catch (err) {
    log.error(err)
    next(err)
  }
})

module.exports = router
