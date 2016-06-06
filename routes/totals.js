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

function getTotals (res) {
  res.app.locals.fb.child(COUNTERS).once("value", function(snapshot) {
    var counters = snapshot.val()
    var response = {}
    response[COMPANIES] = counters[COMPANIES][FEATURES]
    response[CHARITIES] = counters[CHARITIES][FEATURES]
    res.json(response)
  }, function (errorObject) {
    console.log('The read failed: ' + errorObject.code)
  })
}

router.get('/', function (req, res, next) {
  getTotals(res)
})

module.exports = router
