$(document).ready(function() {

})

// Functions =============================================================

const COUNTERS = 'counters';
const COMPANIES = 'company';
const DOIT = 'doit'
const ERRORS = 'errors';
const CHARITIES = 'charity';
const FEATURES = 'feature';
const GEOQ = 'geoqueue';
const OLD = 'charities';
// batch, interval and fburl defined via jade tempalate
var map;
var nextid = 0;
var mc;
var geocoder;
var infowindow;
var FBref= new Firebase(fburl);
var georef = {};
georef[CHARITIES] = new GeoFire(FBref.child(FEATURES).child(CHARITIES));
georef[COMPANIES] = new GeoFire(FBref.child(FEATURES).child(COMPANIES));
var markPCs = {};
markPCs[COMPANIES] = {};
markPCs[CHARITIES] = {};
markPCs[DOIT] = {}
var markers = {};
markers[CHARITIES] = [];
markers[COMPANIES] = [];
markers[DOIT] = [];
var markerIDs = {}
markerIDs[CHARITIES] = {}
markerIDs[COMPANIES] = {}
markerIDs[DOIT] = {}
var geoQuery = {};
var mapDetails;
var icon = {};
icon[COMPANIES] = 'http://maps.google.com/mapfiles/ms/icons/blue.png'
icon[CHARITIES] = 'http://maps.google.com/mapfiles/ms/icons/green.png'
icon[DOIT] = 'http://maps.google.com/mapfiles/ms/icons/red.png'
var radius;
var center;
var tog = {};
tog[CHARITIES] = false;
tog[COMPANIES] = false;
tog[DOIT] = false
var labels = {}
labels[CHARITIES] = 'charities'
labels[COMPANIES] = 'companies'
labels[DOIT] = 'opportunities'
var webLink = {};
webLink[COMPANIES] = function (id) {
  return '<a href="https://beta.companieshouse.gov.uk/company/' + '00000000'.slice(0, -id.length) + id + '"> Company ID : ' + id + '</a>'
}
webLink[CHARITIES] = function (id) {
  return '<a href="http://beta.charitycommission.gov.uk/charity-details/?regid=' + id + '&subid=0"> Charity ID : ' + id + '</a>'
}

function initMap() {

      if (Cookies.get("mapdetails")) {
        // They've been here before.
        mapDetails = Cookies.getJSON("mapdetails");
      } else {
        // set a new cookie
        mapDetails = {zoom: 9, center: {lat: 52.569673, lng: -1.579285}};
        Cookies.set("mapdetails", mapDetails);
      }

      map = new google.maps.Map(document.getElementById('map'), mapDetails);
      mc = new MarkerClusterer(map);
      geocoder = new google.maps.Geocoder();

      google.maps.event.addListener(map, 'idle', function() {
         populateMap();
      });

      document.getElementById('doit').addEventListener("click", function () {
        toggle(DOIT)
      })

      document.getElementById("charity").addEventListener("click", function() {
        toggle(CHARITIES);
      });

      document.getElementById("company").addEventListener("click", function() {
        toggle(COMPANIES);
      });

      document.getElementById("postcode").addEventListener("keypress", function(e) {
        if (e.keyCode == 13) {
          movemap();
          return false;
        }
      })

      document.getElementById('spinner').style.display = "none";

      updateCounters()
}

function updateCounters() {
  $.getJSON( '/totals', function(counters) {
    document.getElementById('counters').innerHTML =
      'Total markers so far. Charities: ' +
      counters[CHARITIES] +
      ' Companies: ' +
      counters[COMPANIES]
  })
}


// Fill map with data
function populateMap() {
// hande duplicate markers

  var bounds = map.getBounds();
  var CTR = bounds.getCenter();
  var NE = bounds.getNorthEast();
  var SW = bounds.getSouthWest();
  var height = GeoFire.distance([NE.lat(), NE.lng()],[SW.lat(), NE.lng()]);
  var width = GeoFire.distance([NE.lat(), NE.lng()],[NE.lat(), SW.lng()]);
  radius = (height > width) ? width/2 : height/2;
  center = [CTR.lat(), CTR.lng()];
  mapDetails = {zoom: map.getZoom(), center: {lat: CTR.lat(), lng: CTR.lng()}};
  Cookies.set("mapdetails", mapDetails);

  if (tog[CHARITIES]) {
    refresh(CHARITIES)
  }

  if (tog[COMPANIES]) {
    refresh(COMPANIES)
  }

  if (tog[DOIT]) {
    refresh(DOIT)
  }
}

function doItPage (page) {
  if (markers[DOIT].length < batch) {
    $.getJSON('/DOIT', {page: page.toString(), lat: center[0].toString(), lng: center[1].toString(), miles: (radius/1.6).toString()}, function (response) {
      if (response.meta.code !== 200) {
        console.log("Do-It error Page:'" + page + "' Code:" + response.meta.code + " Type:" + response.meta.error_type + " Message:'" + reponse.meta.error_message + "'")
        document.getElementById('spinner').style.display = "none"
      } else {
        for (var i=0; i < response.data.items.length; i++) {
          if (!(markerIDs[DOIT][response.data.items[i].id])) {
            markerIDs[DOIT][response.data.items[i].id] = true
            var contentString = '<div>'
            contentString = '<h1><a href="http://do-it.org/opportunities/' + response.data.items[i].id + '"> Do-It : ' + response.data.items[i].title + '</a></h1>'
            contentString += '<p>' + response.data.items[i].for_recruiter.name + '</p>'
            contentString += '<p>' + response.data.items[i].postcode + '</p>'
            contentString += '</div>'
            var location = [response.data.items[i].lat, response.data.items[i].lng]
            setMarker(DOIT, response.data.items[i].id, location, contentString, geohash(location), response.data.items[i].title)
          }
        }

        if (page < response.meta.total_pages) {
          if (markers[DOIT].length < batch) {
            doItPage(page+1)
          } else {
            document.getElementById("message").innerHTML= "Query limit: Only showing first " + batch + " " + labels[DOIT]
          }
        }
      }
    })
  } else {
    document.getElementById('spinner').style.display = "none"
  }
}
/**
 * Generates a geohash in the same form as GeoFire
 *
 * @param {Array.<number>} location The [latitude, longitude] pair to encode into a geohash.
 * @return {string} The geohash of the inputted location.
 */
function geohash (location) {

  // Characters used in location geohashes
  const g_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  precision = 10;

  var latitudeRange = {
    min: -90,
    max: 90
  };
  var longitudeRange = {
    min: -180,
    max: 180
  };
  var hash = "";
  var hashVal = 0;
  var bits = 0;
  var even = 1;

  while (hash.length < precision) {
    var val = even ? location[1] : location[0];
    var range = even ? longitudeRange : latitudeRange;
    var mid = (range.min + range.max) / 2;

    /* jshint -W016 */
    if (val > mid) {
      hashVal = (hashVal << 1) + 1;
      range.min = mid;
    }
    else {
      hashVal = (hashVal << 1) + 0;
      range.max = mid;
    }
    /* jshint +W016 */

    even = !even;
    if (bits < 4) {
      bits++;
    }
    else {
      bits = 0;
      hash += g_BASE32[hashVal];
      hashVal = 0;
    }
  }

  return hash;
};

function toggle (type) {
  if (tog[type]) {
    if (geoQuery[type]) {
      geoQuery[type].cancel();
      delete geoQuery[type];
    }
    for (i=0; i < markers[type].length; i++) {
      mc.removeMarker(markers[type][i]);
      markers[type][i].setMap(null);
    }
    delete markers[type];
    delete markPCs[type];
    delete markerIDs[type]
    markPCs[type]={};
    markers[type]=[];
    markerIDs[type]={}
    tog[type] = false;
    document.getElementById(type).innerHTML="Find "+labels[type];
    document.getElementById("message").innerHTML="";
  } else {
    refresh(type);
    tog[type] = true;
    document.getElementById(type).innerHTML="Clear "+labels[type];
  }

}

function movemap() {
    geocoder.geocode( { 'address': document.getElementById("postcode").value}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        //Got result, center the map and put it out there
        map.setCenter(results[0].geometry.location);
        map.setZoom(11);
        populateMap();
      } else {
        document.getElementById("message").innerHTML="Postcode search was not successful for the following reason: " + status;
      }
    });
}

function refresh(type) {
  if (markers[type].length == 0) {
    document.getElementById('spinner').style.display = "block";
  }
  if (type == DOIT) {
    doItPage(1)
  } else {
    if (geoQuery[type]) {
  // update existing query
      geoQuery[type].updateCriteria({
        center: center,
        radius: radius
      });
    } else {
  // first time setup
      geoQuery[type] = georef[type].query({
        center: center,
        radius: radius
      });
      findMarkers(type)
    }
  }
}

function findMarkers(type) {
    geoQuery[type].on("key_entered", function(id, location) {
      if (!(markerIDs[type][id])) {
        markerIDs[type][id]=true
        getMarker(type, id, location)
      } else {
           document.getElementById('spinner').style.display = "none";
      }
    });
}

function getMarker(type, id, location) {
      FBref.child(type).child(id).once("value", function(snapshot) {
        var contentString;
        var marker;
        var feature;

        if (markers[type].length > batch) {
           if (geoQuery[type]) {
             geoQuery[type].cancel();
             delete geoQuery[type];
             document.getElementById("message").innerHTML=type + "Query limit: Only showing first " + batch + " " + labels[type]
           };
           document.getElementById('spinner').style.display = "none";
        } else {
          if (snapshot.exists()) {
            feature = snapshot.val();
            contentString = '<div>';
            contentString = '<h1>' + webLink[type](id) + '</h1>';
            contentString += '<p>' + feature.name + '</p>';
            contentString += '<p>' + feature.postcode + '</p>';
            if (feature.url) {
              contentString += '<p><a href="'+feature.url+'">Web site</a></p>';
            };
            contentString += '</div>' ;
            getFeature(type, id, location, contentString, id.toString())
          } else {
            console.log('Feature for ' + type + ' ID : ' + id + ' found but details not found in firebase');
            document.getElementById('spinner').style.display = "none";
          }
        }
      });
}

function getFeature(type, id, location, contentString, title) {
  FBref.child(FEATURES).child(type).child(id).child("g").once("value", function (snapshot) {
    var geo = snapshot.val()
    setMarker(type, id, location, contentString, geo, title)
  })
}

function setMarker(type, id, location, contentString, geo, title) {
  const scale = .0001;
  const density = 6;
  const correct = 1.4;

  var counts = {};
  var nudge = {lat: 0, lng: 0}
  counts[COMPANIES]=0;
  counts[CHARITIES]=0;
  counts[DOIT]=0

  if (markPCs[COMPANIES][geo]) {
    counts[COMPANIES] = markPCs[COMPANIES][geo];
  }
  if (markPCs[CHARITIES][geo]) {
    counts[CHARITIES] = markPCs[CHARITIES][geo];
  }
  if (markPCs[DOIT][geo]) {
    counts[DOIT] = markPCs[DOIT][geo]
  }
  var total = counts[COMPANIES]+counts[CHARITIES]+counts[DOIT];
  if (total > 0) {
    var factor = Math.floor((Math.sqrt(density*(density+8*(total-1)))+density)/2/density)
    var angle = total*Math.PI/3/factor;
    markPCs[type][geo] = counts[type]+1;
    nudge = {lat: scale*factor*Math.sin(angle), lng: correct*scale*factor*Math.cos(angle)};
  } else {
    markPCs[type][geo]=1
  }
  var markerDetails = {
    position: {lat: location[0]+nudge.lat,lng: location[1]+nudge.lng},
    map: map,
    title: title,
    icon: icon[type]
  };
  marker = newMarker(markerDetails, contentString);
  mc.addMarker(marker);
  markers[type].push(marker);
  document.getElementById('spinner').style.display = "none"
}

// function nudge() {
//   return (Math.random()-0.5)*0.001;
// }

function newMarker (details, content) {
  var marker = new google.maps.Marker(details)

  marker.addListener ('click', function() {
    if (infowindow) {
        infowindow.close();
    }
    infowindow = new google.maps.InfoWindow({content: content});
    infowindow.open(map, marker);
  });
  return marker;
}
