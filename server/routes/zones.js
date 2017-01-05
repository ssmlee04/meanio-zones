/*jshint -W079 */
'use strict'

var zones = require('../controllers/zones')
var city = require('../controllers/city')
var country = require('../controllers/country')

// The Package is past automatically as first parameter
module.exports = function(Zone, app, auth, database, passport) {

  app.route('/apis/v1/zones/countries')
    .get(country.find)
 
  app.route('/apis/v1/zones/countries/:zid')
    .get(country.findCountry)
    .put(auth.requiresRootAdmin, country.editCountryNames)

  app.route('/apis/v1/zones/countries/:zid/states/:sid')
    .get(city.findState)
    .put(auth.requiresRootAdmin, city.editStateNames)

  app.route('/apis/v1/zones/countries/:zid/states/:sid/cities/:cid')
    .get(auth.requiresRootAdmin, city.findCity)
    .put(auth.requiresRootAdmin, city.editCityNames)

  app.route('/apis/v1/zones/countries/:zid/states')
    .get(city.findStates)
  app.route('/apis/v1/zones/countries/:zid/states/:sid/cities')
    .get(city.findCities)

  app.route('/apis/v1/zones/autocomplete/country/:str')
    .get(country.autocompleteCountry)
  app.route('/apis/v1/zones/autocomplete/state/:str')
    .get(city.autocompleteState)
  app.route('/apis/v1/zones/autocomplete/city/:str')
    .get(city.autocompleteCity)

  app.route('/apis/v1/zones/locate/:longitude/:latitude')
    .get(zones.getlonlatinfo)
    .put(auth.requiresRootAdmin, zones.setlonlatinfo)
}
