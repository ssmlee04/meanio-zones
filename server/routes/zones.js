/*jshint -W079 */
"use strict";

var zones = require("../controllers/zones");
var city = require("../controllers/city");
var country = require("../controllers/country");
var routeCache = require("route-cache");

// The Package is past automatically as first parameter
module.exports = function(Zone, app, auth, database, passport) {

  app.route("/apis/v1/zones/countries")
    .get(routeCache.cacheSeconds(5), country.find);
 
  app.route("/apis/v1/zones/countries/:zid")
    .get(routeCache.cacheSeconds(5), country.findCountry)
    .put(auth.requiresRootAdmin, country.editCountryNames)

  app.route("/apis/v1/zones/countries/:zid/states/:sid")
    .get(routeCache.cacheSeconds(5), city.findState)
    .put(auth.requiresRootAdmin, city.editStateNames)

  app.route("/apis/v1/zones/countries/:zid/states/:sid/cities/:cid")
    .get(auth.requiresRootAdmin, city.findCity)
    .put(auth.requiresRootAdmin, city.editCityNames)

  app.route("/apis/v1/zones/countries/:zid/states")
    .get(routeCache.cacheSeconds(5), city.findStates);
  app.route("/apis/v1/zones/countries/:zid/states/:sid/cities")
    .get(routeCache.cacheSeconds(5), city.findCities);

  app.route("/apis/v1/zones/autocomplete/country/:str")
    .get(routeCache.cacheSeconds(5), country.autocompleteCountry);
  app.route("/apis/v1/zones/autocomplete/state/:str")
    .get(routeCache.cacheSeconds(5), city.autocompleteState);
  app.route("/apis/v1/zones/autocomplete/city/:str")
    .get(routeCache.cacheSeconds(5), city.autocompleteCity);

  app.route("/apis/v1/zones/locate/:longitude/:latitude")
    .get(routeCache.cacheSeconds(5), zones.getlonlatinfo)
    .put(auth.requiresRootAdmin, zones.setlonlatinfo);

};
