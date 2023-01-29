import { log } from '../logging'

const bwipjs = require('bwip-js')
var express = require('express');
var router = express.Router();

//Endpoints
router.get('/api/generate-barcode', async (req, res, next) => {

  try {
    await bwipjs.request(req, res); // Executes asynchronously
  } catch(err) {
    log.error(`Error generating barcode: ${err as Error}`)
    res.writeHead(400, { 'Content-Type':'text/plain' });
    res.end(`Error generating barcode: ${err as Error}`, "utf8")
  }
})

module.exports = router