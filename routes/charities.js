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

function getCharity (res, index, count) {
  res.app.locals.fb.child(CHARITIES).orderByKey().startAt(index).limitToFirst(count).once("value", function(snapshot) {
    var total = snapshot.numChildren();
    var details = [];
    snapshot.forEach(function(data) {
      var charity = data.val();
      charity.id = parseInt(data.key());
      details.push(charity);
      if (details.length == total) {
        res.json(details);
      }
    });
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

router.get('/:id', function(req, res, next) {

  getCharity(res, req.params.id, 1);

});

router.get('/:id/:count', function(req, res, next) {

  getCharity(res, req.params.id, parseInt(req.params.count));

});

module.exports = router;
