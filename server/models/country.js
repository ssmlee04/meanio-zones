/*jshint -W079 */
'use strict'

/**
 * Module dependencies.
 */
var mongoose = require('mongoose')
var Promise = require('bluebird')
var Schema = mongoose.Schema

var CountrySchema = new Schema({
  zn: {
    type: String,
    index: { unique: true },
    // required: true
  },
  zns_: {},
  zid: {
    type: Number,
    index: { unique: true },
    required: true
  },
  status: {
    type: Boolean,
    default: 0
  }
}, {
  collection: 'oc_country',
  timestamps: true
})

CountrySchema.statics.getMaxZid = function() {
  return Promise.cast(this.findOne({}).sort({'zid' : -1}).exec())
  .then(function(d) {
    return d && d.zid || 0
  })
}

CountrySchema.statics.get = function() {
  return Promise.cast(this.find({}).sort('zn').lean().exec())
}

CountrySchema.statics.__insert = function(name) {
  var that = this
  // if (!name) {
  //   return Promise.resolve()
  // }

  return Promise.cast(that.findOne({zn: name}).exec()).delay(Math.random() * 100)
  .then(function(d) {
    if (d && d._id) {
      return d
    } else {
      return that.getMaxZid() // d is max zid now
      .then(function(d) {
        return Promise.cast(that.create({zn: name, zid: d + 1}))
      })
    }
  })
}

mongoose.model('Country', CountrySchema)

