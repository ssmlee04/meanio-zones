'use strict'

/*
 * Defining the Package
 */
var Module = require('meanio').Module

var Zones = new Module('meanio-zones')

Zones.register(function(app, auth, database) {

  Zones.routes(app, auth, database)

  return Zones
})
