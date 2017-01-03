/*jshint -W079 */
/*jshint -W097*/
'use strict'

/**
 * Module dependencies.
 */
var validator = require('validator')
var mongoose = require('mongoose')
var Promise = require('bluebird')
var Schema = mongoose.Schema
var latStart = -90
var latEnd = 90
var lonStart = -180
var lonEnd = 180

var PRECISION = 2
var LON_LAT_STEP = 0.02
var LON_LAT_MULTIPLIER = 1000000

var toNearestStepLarge = function(small) {
  return Math.round(small / LON_LAT_STEP) * LON_LAT_STEP * LON_LAT_MULTIPLIER
}
var toNearestStepSmall = function(large) {
  return parseFloat(large / LON_LAT_MULTIPLIER).toFixed(PRECISION)
}

var CitiesSchema = new Schema({
  cid: {
    type: Number,
    required: true
  },
  cn: {
    type: String,
    required: true
  },
  cns_: {},
  status: {
    type: Number,
    default: 0
  },
  locs: []
}, {_id: false})

var CitySchema = new Schema({
  zid: {
    type: Number,
    required: true,
    index: true
  },
  sid: {
    type: Number,
    required: true,
    index: { unique: true }
  },
  zn: {
    type: String,
    // required: true
  },
  zn_local: {
    type: String
  },
  zns_ : {

  },
  sn: {
    type: String
  },
  sn_local: {
    type: String
  },
  sns_ : {

  },
  status: {
    type: Number,
    default: 0
  },
  locs: [],
  zs : {
    type: String,
    // required: true,
    index: { unique: true }
  },
  mcid: { // maximum cid inside
    type: Number,
    required: true
  },
  cities: [CitiesSchema]
}, {
  collection: 'oc_city',
  timestamps: true
})

var zsname = function(zname, sname) {
  return (zname.toString() + sname.toString()).toString().replace(/ /g, '').replace(' ', '')
}

CitySchema.statics.getMaxSid = function() {
  return Promise.cast(this.findOne({}, {cities: 0}).sort({'sid' : -1}).exec())
  .then(function(d) {
    return d && d.sid || 0
  })
}

CitySchema.statics.getMaxCid = function() {
  return Promise.cast(this.findOne({}, {cities: 0}).sort({'mcid' : -1}).exec())
  .then(function(d) {
    return d && d.mcid || 0
  })
}

CitySchema.statics.getStates = function(zid) {
  var that = this
  return Promise.cast(that.find({zid: zid}).sort('sn').lean().exec())
}

CitySchema.statics.getCities = function(sid) {
  var that = this
  return Promise.cast(that.findOne({sid: sid}).lean().exec())
  .then(function(d) {
    return d.cities.sort(function(a, b) {return a.cn > b.cn})
  })
}

CitySchema.statics.createCountryStateCity = function(zname, sname, cname, lon, lat) {
  var that = this
  if (sname && !zname) {
    return Promise.reject('text-error-state-without-country')
  }
  if (cname && !sname) {
    return Promise.reject('text-error-city-without-state')
  }
  if (!validator.isFloat(lon) || lon > lonEnd || lon < lonStart) {
    return Promise.reject('text-error-longitude')
  }
  if (!validator.isFloat(lat) || lat > latEnd || lat < latStart) {
    return Promise.reject('text-error-latitude')
  }
  var zs = zsname(zname, sname)
  var largeLon = toNearestStepLarge(lon)
  var largeLat = toNearestStepLarge(lat)

  return that.__createCountryState(zname, sname)
  .then(function() {
    return Promise.cast(that.update({zs: zs, 'locs' : {$nin : [[largeLon, largeLat]]}}, {$push: {'locs': [largeLon, largeLat]}}).exec())
  }).then(function() {
    if (!cname) {
      return Promise.resolve()
    } else {
      return that.getMaxCid()
      .then(function(d) {
        var mcid = (d ? d : 0)
        return Promise.cast(that.update({zs: zs, 'cities.cn': {'$ne' :cname}}, {mcid: mcid + 1, '$push':{cities:{cn:cname, cid: mcid + 1 }}}).exec())
      }).then(function() {
        return Promise.cast(that.update({zs: zs, 'cities.cn': cname, 'cities.locs' : {$nin : [[largeLon, largeLat]]}}, {$push: {'cities.$.locs': [largeLon, largeLat]}}).exec())
      })
    }
  })
}

CitySchema.statics.__createCountryState = function(zname, sname) {
  var that = this
  if (sname && !zname) {
    return Promise.reject('text-error-state-without-country')
  }
  var Country = mongoose.model('Country')
  var zs = zsname(zname, sname)

  return Promise.bind({})
  .then(function() {
    return Promise.cast(that.findOne({zs: zs}).exec())
  }).then(function(d) {
    if (d && d._id) {
      return d // country exists
    } else {
      return Promise.all([that.getMaxSid(), Promise.cast(Country.findOne({zn: zname}).exec())]).bind(this)
      .then(function(d) {
        this.sid = d[0] // max sid
        this.zid = d[1] && d[1].zid || -1

        if (!d[1]) {
          return Country.__insert(zname).bind(this).then(function(d) {
            this.zid = d.zid
          })
        }
      }).then(function() {
        return Promise.cast(that.create({zn: zname, zn_local: zname, zid: this.zid, sn: sname, sn_local: sname, sid: this.sid + 1, zs: zs, mcid: 0}))
      })
    }
  })
}

mongoose.model('City', CitySchema)

