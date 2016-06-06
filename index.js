var express = require('express')
var path = require('path')
// var favicon = require('serve-favicon')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var request = require('request')
// const fs = require('fs')
var Firebase = require('firebase')
var GeoFire = require('geofire')
var Converter = require('csvtojson').Converter

var googleKey = process.env.GOOGLEKEY
var charLoad = process.env.CHARITY
var compLoad = process.env.COMPANY
var geoLoad = process.env.GEO
var firebaseKey = process.env.FIREBASEKEY
var firebaseURL = process.env.FIREBASEURL
// var cleanUp = process.env.CLEANUP
var companyKey = process.env.COMPANYKEY

var routes = require('./routes/index')
var charities = require('./routes/charities')
var totals = require('./routes/totals')
var doit = require('./routes/doit')
// var test = require('./routes/test');

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

var chartimer
var comptimer
var geotimer;
// var dbtimer;

const COUNTERS = 'counters';
const COMPANIES = 'company';
const ERRORS = 'errors';
const CHARITIES = 'charity';
const FEATURES = 'feature';
const GEOQ = 'geoqueue';
const OLD = 'charities';

var FBref = new Firebase(firebaseURL);
var georef = {};
georef[CHARITIES] = new GeoFire(FBref.child(FEATURES).child(CHARITIES));
georef[COMPANIES] = new GeoFire(FBref.child(FEATURES).child(COMPANIES));

var converter = new Converter({});

//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (jsonArray) {
   console.log("CSV file loaded");
});

converter.on("record_parsed", function(resultRow, rawRow, rowIndex) {
  FBref.child("postcodes").child(resultRow.postcode).set({lat: resultRow.latitude, lng: resultRow.longitude});
});

FBref.authWithCustomToken(firebaseKey, function() {
  app.locals.fb = FBref;

  FBref.child("postcodes").startAt().limitToFirst(1).once("value", function (snapshot) {
    if (snapshot.exists()) {
      // Skip load process
      console.log("Postcodes already loaded");
    } else {
      // Load postcodes
      console.log("Loading post codes into Firebase");
      //read from file
      require("fs").createReadStream("./ukpostcodes.csv").pipe(converter);
    }
  });

  if (charLoad > 0) {
    chartimer = setInterval(nextCharity, charLoad);
    console.log('Charity loader timer set');
  }

  if (compLoad > 0) {
    comptimer = setInterval(nextCompany, compLoad);
    console.log('Company loader timer set');
  }

  if (geoLoad > 0) {
    geotimer = setInterval(nextGeo, geoLoad);
    console.log('Geocode timer set');
  }

  dailySummary();
  setInterval(dailySummary, 3600000)
});

function dailySummary() {

  setSummary(FBref.child(COUNTERS).child(COMPANIES).child(FEATURES), firebaseURL + FEATURES + '/' + COMPANIES)
  setSummary(FBref.child(COUNTERS).child(CHARITIES).child(FEATURES), firebaseURL + FEATURES + '/' + CHARITIES)
  setSummary(FBref.child(COUNTERS).child(GEOQ), firebaseURL + GEOQ)
  setSummary(FBref.child(COUNTERS).child("postcodes"), firebaseURL + 'postcodes')

}

function setSummary(counterRef, dataURL) {
  var options = {
    url: dataURL + '.json?shallow=true'
  }

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        var record = JSON.parse(body);
        counterRef.set(Object.keys(record).length)
      } catch(err) {
        console.log('Error parsing ' + options.url + ' code ' + err)
      }
    } else {
      console.log('Error querying ' + options.url)
    }
  })
}

function nextCompany() {
  var countref = FBref.child(COUNTERS).child(COMPANIES)
  countref.once("value", function(snapshot) {
    var counters = snapshot.val();
    var companyid = counters.next++;

    if (companyid > counters.end) {
      clearInterval(comptimer);
      console.log('Finished Company Load');
      companyid = counters.start;
    }
    countref.child('next').set(counters.next++);

    if (companyid % 250 === 0) {
      console.log('Looking for company ' + companyid);
    }

    getCompany(companyid);

  }); // countref
}

function getCompany(companyid) {
    var id = companyid.toString();

    var options = {
      url: 'https://api.companieshouse.gov.uk/company/' + "00000000".slice(0,-id.length)+ id,
      auth:{"user": companyKey}
    };

    getData(COMPANIES, id, options, unpackCompany);
}

function unpackCompany(record) {
  var isActive=(record.company_status=='active')? true: false;
  var postcode;
  var hasPostcode=false;
  var name=record.company_name;

  if (record.registered_office_address) {
    if (record.registered_office_address.postal_code) {
      hasPostcode=true;
      postcode=record.registered_office_address.postal_code;
    }
  }

  return {isActive: isActive, hasPostcode: hasPostcode, postcode: postcode, name: name, url: null};
}


function getData(type, id, options, unPack) {
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          var record = JSON.parse(body);
          var data = unPack(record);
          if (!data.isActive) {
            FBref.child(ERRORS).child(type).child(id).set({'Not active': "" + data.name});
            FBref.child(type).child(id).remove();
          } else {
            FBref.child(type).child(id).set({
              name: data.name,
              url: data.url,
              postcode: data.postcode
            });
            if (data.hasPostcode) {
              geoPostcode(type, id, data.postcode);
            } else {
              FBref.child(ERRORS).child(type).child(id).set({missing: 'no post code'});
            }
          }
        } catch(err) {
          console.log('Error:' + err + ' ' + type + ' Id:' + id);
        }
      } else {
        if (response) {
          FBref.child(ERRORS).child(type).child(id).set({notFound: 'Not found in data source' + response.statusCode});
        } else {
          FBref.child(ERRORS).child(type).child(id).set({notFound: 'Not found in data source ' + error});
        }
      } // request error
    }); // request
}

function geoPostcode(type, id, postcode) {
                FBref.child("postcodes").child(postcode).once("value", function (snapshot) {
                  if (snapshot.exists()) {
                    var pcDetails = snapshot.val();
                    georef[type].set(id, [pcDetails.lat, pcDetails.lng]);
                  } else {
                    FBref.child(GEOQ).push({
                      type: type,
                      location: postcode,
                      id: id
                    });
                  }
                });
}


function nextCharity() {
  var countref = FBref.child(COUNTERS).child(CHARITIES)
  countref.once("value", function(snapshot) {
    var counters = snapshot.val();
    var charityid = counters.next++;

    if (charityid > counters.end) {
      clearInterval(chartimer);
      console.log('Finished Charity Load');
      charityid = counters.start;
    }
    countref.child('next').set(counters.next++);

    if (charityid % 250 === 0) {
      console.log('Looking for charity ' + charityid);
    }
    getCharity(charityid.toString());
  }); // countref
}

function unpackCharity(record) {
  var isActive=(record.charity.date_removed)? false : true;
  var postcode;
  var hasPostcode=false;
  var name=record.charity.title;
  var url=record.charity.website;

  if (record.charity.address) {
    if (record.charity.address.postal_code) {
      hasPostcode=true;
      postcode=record.charity.address.postal_code;
    }
  }

  return {isActive: isActive, hasPostcode: hasPostcode, postcode: postcode, name: name, url: null};
}


function getCharity(charityid) {
    var id = charityid.toString();

    var options = {
      url: 'http://opencharities.org/charities/' + id + '.json'
    };

    getData(CHARITIES, id, options, unpackCharity);
}

function nextGeo() {
  FBref.child(GEOQ).startAt().limitToFirst(1).once("value", function (snapshot) {
   snapshot.forEach(function (snap) {
    var feature
    if (snap.exists()) {
      feature = snap.val();
      FBref.child(GEOQ).child(snap.key()).remove();
      checkIfCoded(feature)
    } // exists
   }); //for each
  }); // geoq
}

function checkIfCoded(feature) {
      FBref.child("postcodes").child(feature.location).once("value", function (pcsnap) {
        if (pcsnap.exists()) {
          // Must have found this post code in the meantime, don't need to use google
          var pcDetails = pcsnap.val();
          georef[feature.type].set(feature.id.toString(), [pcDetails.lat, pcDetails.lng]);
          // Didn't use google so get try another geocode immediately
          nextGeo();
        } else {
          geoCode(feature);
        }
      }) //post code search

}


function geoCode(feature) {
      try {
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + feature.location.replace(/ /g,"+") +'&key=' + googleKey;
        request(url, function (gerr, gres, gbod) {
          if (!gerr && gres.statusCode == 200) {
            try {
              var gdat = JSON.parse(gbod);
              var lat=gdat.results[0].geometry.location.lat;
              var lng=gdat.results[0].geometry.location.lng;
                georef[feature.type].set(feature.id.toString(), [lat, lng]);
                FBref.child("postcodes").child(feature.location).set({lat: lat, lng: lng});
            } catch (err) {
              console.log('Geocode parse error:' + err);
              FBref.child(ERRORS).child(feature.type).child(feature.id).set({geocode: 'Geocode parse error:' + err});
            } // try to parse geocode response
          } else {
            console.log('No google api response. Error: ' + gerr);
            FBref.child(ERRORS).child(feature.type).child(feature.id).set({geocode: 'No google api response. Error: ' + gerr});
          } // if geocode request error
        }); request
      } catch(err) {
        console.log('Google api request error: ' + err);
        FBref.child(ERRORS).child(feature.type).child(feature.id).set({geocode: 'Google api request error: ' + err});
      } // try around request
}

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes)
// app.use('/test', test);
app.use('/charities', charities)
app.use('/totals', totals)
app.use('/doit', doit)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
app.set('port', (process.env.PORT || 5000));

/*
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});
*/

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
