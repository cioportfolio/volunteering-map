var express = require('express');
var router = express.Router();
var request = require('request');


const COUNTERS = 'counters';
const COMPANIES = 'company';
const ERRORS = 'errors';
const CHARITIES = 'charity';
const FEATURES = 'feature';
const GEOQ = 'geoqueue';
const OLD = 'charities';

function doItPage (res, page, lat, lng, miles) {
  var url = 'https://api.do-it.org/v1/opportunities?lat=' + lat + '&lng=' + lng + '&miles=' + miles + '&page=' + page
  request(url, function (gerr, gres, gbod) {
    if (!gerr && gres.statusCode == 200) {
      res.json(JSON.parse(gbod))
    } else {
      console.log('No google api response. Error: ' + gerr)
    } // if geocode request error
  }); request
}

router.get('/', function (req, res, next) {
  doItPage(res, req.query.page, req.query.lat, req.query.lng, req.query.miles)
})

module.exports = router;
