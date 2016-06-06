var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {title: 'Geographic Index of UK Charities', batch: process.env.MAPBATCH, interval: process.env.MAPINTERVAL, fburl: process.env.FIREBASEURL})
})

module.exports = router
