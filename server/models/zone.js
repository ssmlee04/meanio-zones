/*jshint -W079 */
/*jshint -W097*/
'use strict'

/**
 * Module dependencies.
 */
var Promise = require('bluebird')
var mongoose = require('mongoose')
var Schema = mongoose.Schema
// var config = require('meanio').loadConfig()
// var path = require('path')
var validator = require('validator')
var googlemaps = require('./../googlemaps')
var _ = require('lodash')
var latStart = -90
var latEnd = 90
var lonStart = -180
var lonEnd = 180
var LON_LAT_STEP = 0.02
var LON_LAT_MULTIPLIER = 1000000

// var validStatuses = [
//   'OK', // => 1
//   'MANUAL_OVERRIDE' // => 100
// ]
// var invalidStatuses = [
//   'ZERO_RESULTS', // => -1
//   'OVER_QUERY_LIMIT', // => -2
//   'REQUEST_DENIED', // => -3
//   'INVALID_REQUEST', // => -4
//   'UNKNOWN_ERROR' // => -5
// ]

var toNearestStepLarge = function(small) {
  return Math.round(Math.round(small / LON_LAT_STEP) * LON_LAT_STEP * LON_LAT_MULTIPLIER)
}
// var toNearestStepSmall = function(large) {
//   return parseFloat(large / LON_LAT_MULTIPLIER).toFixed(PRECISION)
// }

var ZoneSchema = new Schema({
  lon: {
    type: Number,
    required: true,
    default: 0
  },
  lat: {
    type: Number,
    required: true,
    default: 0
  },
  zid: {
    type: Number,
    required: true,
    default: 0
  },
  sid: {
    type: Number,
    required: true,
    default: 0
  },
  cid: {
    type: Number,
    required: true,
    default: 0
  },
  zn: {
    type: String,
    default: ''
  },
  sn: {
    type: String,
    default: ''
  },
  cn: {
    type: String,
    default: ''
  },
  status: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  collection: 'oc_zones',
  timestamps: true
})

ZoneSchema.index({lon: 1, lat: 1}, {unique: true})

var zsname = function(zname, sname) {
  return (zname.toString() + sname.toString()).toString().replace(/ /g, '').replace(' ', '')
}

ZoneSchema.statics._insertCountryStateCity = function(zname, sname, cname, lon, lat, status) {
  // generally status flag can only be 1 (OK) or 100 (MANUAL_OVERRIDE)
  var that = this
  var Country = mongoose.model('Country')
  var City = mongoose.model('City')

  return Promise.resolve()
  .then(function() {
    return Country.__insert(zname) // => generate zid
  }).then(function() {
    return City.createCountryStateCity(zname, sname, cname, lon, lat) // => generate sid, cid
  }).then(function() {
    return that.__insertAndUpdateWithIdsReady(zname, sname, cname, lon, lat, status)
  })
}

ZoneSchema.statics.__insertAndUpdateWithIdsReady = function(zname, sname, cname, lon, lat, status) {
  // generally status flag can only be 1 (OK) or 100 (MANUAL_OVERRIDE)

  var that = this
  var City = mongoose.model('City')
  var zs = zsname(zname, sname)

  if (!zname && status === 1) {
    return Promise.resolve()
  }
  if (!validator.isFloat(lon) || lon > lonEnd || lon < lonStart) {
    return Promise.reject('text-error-longitude')
  }
  if (!validator.isFloat(lat) || lat > latEnd || lat < latStart) {
    return Promise.reject('text-error-latitude')
  }

  return Promise.resolve()
  .then(function() {
    if (cname) { // ok or manual
      return Promise.cast(City.findOne({'zs': zs, 'cities.cn': cname}, {sid: 1, sn: 1, zn: 1, zid: 1, 'cities.$': 1}).exec())
      .then(function(d) {
        if (!d) {
          return Promise.resolve()
        } else {
          var zn = d.zn
          var sn = d.sn || ''
          var cn = d.cities ? d.cities[0].cn : ''
          var zid = d.zid
          var sid = d.sid || -1
          var cid = (d.cities ? d.cities[0].cid : -1)

          return that.__insertAndUpdateWithIds(zn, sn, cn, zid, sid, cid, lon, lat, status)
        }
      })
    } else { // ok or manual
      return Promise.cast(City.findOne({'zs': zs}, {sid: 1, sn: 1, zn: 1, zid: 1}).exec())
      .then(function(d) {
        if (!d) {
          return Promise.resolve()
        } else {
          var zn = d.zn
          var sn = d.sn || ''
          var cn = ''
          var zid = d.zid
          var sid = d.sid || -1
          var cid = (d.cities ? d.cities[0].cid : -1)

          return that.__insertAndUpdateWithIds(zn, sn, cn, zid, sid, cid, lon, lat, status)
        }
      })
    }
  })
}

ZoneSchema.statics.__insertAndUpdateWithIds = function(zname, sname, cname, zid, sid, cid, lon, lat, status) {
  var that = this
  if (!zname && status > 0) {
    return Promise.reject()
  }
  if (!validator.isFloat(lon) || lon > lonEnd || lon < lonStart) {
    return Promise.reject('text-error-longitude')
  }
  if (!validator.isFloat(lat) || lat > latEnd || lat < latStart) {
    return Promise.reject('text-error-latitude')
  }
  var largeLon = toNearestStepLarge(lon)
  var largeLat = toNearestStepLarge(lat)

  var set = {
    lon: largeLon,
    lat: largeLat,
    zn: zname,
    sn: sname,
    cn: cname,
    zid: zid,
    sid: sid,
    cid: cid,
    status: status
  }
  return Promise.cast(that.findOne({lon: largeLon, lat: largeLat}).exec())
  .then(function(d) {
    if (d) {
      return Promise.cast(that.update({lon: largeLon, lat: largeLat}, set).exec())
    } else {
      return Promise.cast(that.create(set))
    }
  }).then(function() {
    return set
  })
}

/*
 * An example reponse is as follows:
 * {
 *   lon: 121600000,
 *   lat: 25030000,
 *   zid: 35,
 *   sid: 433,
 *   cid: 12345,
 *   zn: Taiwan,
 *   sn: Taipei,
 *   cn: Taipei,
 *   status: xxx (0 => initial, 1 => ok, 100 => manual override)
 * }
 */
ZoneSchema.statics.get = function(lon, lat) {
  return this.getLonLatInfo(lon, lat)
}

ZoneSchema.statics.getLonLatInfo = function(lon, lat) {
  var that = this

  if (!validator.isFloat(lon) || lon > lonEnd || lon < lonStart) {
    return Promise.reject('text-error-longitude')
  }
  if (!validator.isFloat(lat) || lat > latEnd || lat < latStart) {
    return Promise.reject('text-error-latitude')
  }

  var largeLon = toNearestStepLarge(lon)
  var largeLat = toNearestStepLarge(lat)

  return Promise.cast(that.findOne({lon: largeLon, lat: largeLat}).exec())
  .then(function(d) {
    if (!d) {
      return Promise.cast(that.create({lon: largeLon, lat: largeLat}))
    } else {
      return d
    }
  })
}

ZoneSchema.statics.set = function(lon, lat, zname, sname, cname) {
  return this.setLonLatinfo(lon, lat, zname, sname, cname)
}

ZoneSchema.statics.setLonLatinfo = function(lon, lat, zname, sname, cname) {
  var that = this

  if (!validator.isFloat(lon) || lon > lonEnd || lon < lonStart) {
    return Promise.reject('text-error-longitude')
  }
  if (!validator.isFloat(lat) || lat > latEnd || lat < latStart) {
    return Promise.reject('text-error-latitude')
  }

  return that._insertCountryStateCity(zname, sname, cname, lon, lat, 100)
}

ZoneSchema.statics.crawl = function(lon, lat) {
  return this.crawlGoogle(lon, lat)
}

ZoneSchema.statics.crawlGoogle = function(lon, lat) {
  var that = this
  var statusCode = 0

  if (!validator.isFloat(lon) || lon > lonEnd || lon < lonStart) {
    return Promise.reject('text-error-longitude')
  }
  if (!validator.isFloat(lat) || lat > latEnd || lat < latStart) {
    return Promise.reject('text-error-latitude')
  }

  return that.getLonLatInfo(lon, lat)
  .then(function(d) {
    if (d && d.status > 0) {
      return d // OK or MANUAL_OVERRIDE
    }
    if (d && d.status === -1) {
      return d // ZERO_RESULTS
    }

    // otherwise, we crawl again
    return googlemaps.reverseGeocode(lon, lat)
    .then(function(data) {
      if (!data || !data.results) {
        // something is simply wrong on the reverse geocode
        console.log(lon, lat, 'error geocoding this point')
        return Promise.resolve({
          status: -100,
          error: 'text-error-reverse-geocode'
        })

      } else if (data.error_message) {
        // catch all errors here
        console.log(lon, lat, data.error_message)
        return Promise.resolve({
          status: -100,
          error: data.error_message
        })

      } else if (data.results.length === 0) {
        console.log(lon, lat, data.status)
        if (data.status === 'ZERO_RESULTS') {
          statusCode = -1
          return that._insertCountryStateCity('', '', '', lon, lat, statusCode)
        } else {
          return Promise.resolve({
            status: -100,
            error: 'text-error-reverse-geocode'
          })
        }
      } else {
        var lists = data.results[0].address_components
        var result = _.reduce(lists, function(r, d) {
          if (d.types.indexOf('administrative_area_level_1') > -1) {
            r.administrative_area_level_1 = d.long_name
          }
          if (d.types.indexOf('administrative_area_level_2') > -1) {
            r.administrative_area_level_2 = d.long_name
          }
          if (d.types.indexOf('sublocality') > -1) {
            r.sublocality = d.long_name
          }
          if (d.types.indexOf('locality') > -1) {
            r.locality = d.long_name
          }
          if (d.types.indexOf('country') > -1) {
            r.country = d.long_name
          }
          return r
        }, {})

        var status = data.status || ''
        if (status === 'OK') {
          statusCode = 1
        }
        var country = result && result.country || ''
        var state = result && result.administrative_area_level_1 || ''
        var locality = result && result.locality || ''
        var sublocality = result && result.sublocality || ''
        var city = locality || sublocality
        if (state === 'null' || state === 'undefined' || state === '') {
          state = ''
          city = ''
        }
        if (city === 'null' || city === 'undefined') {
          city = ''
        }

        return that._insertCountryStateCity(country, state, city, lon, lat, statusCode)
      }
    })
  }).then(function(d) {
    return d
  })
}

ZoneSchema.statics.setKeys = function(ks) {
  return googlemaps.setKeys(ks)
}

mongoose.model('Zone', ZoneSchema)

