/*jshint -W079 */
'use strict'

/**
 * Module dependencies.
 */

var _ = require('lodash')
var Promise = require('bluebird')
var mongoose = require('mongoose')
var City = mongoose.model('City')
var Country = mongoose.model('Country')

/**
 * List of zones
 */
exports.find = function(req, res) {
  var lang = req.query.lang
  Promise.cast(Country.get())
  .then(function(d){
    d = JSON.parse(JSON.stringify(d))
    if (lang){
      d = d.map(function(d){
        d.zn = d.zn || (d.zns_ && d.zns_[lang])
        delete d.zns_
        delete d._id
        delete d.__v
        delete d.zn_local
        return d
      })
    }
    res.json(d)
  }).catch(function(err){
    res.json(500, {error: 'Cannot list the countries', err: err})
  })
}

exports.findCountry = function(req, res) {
  var zid = req.params.zid
  Promise.cast(Country.find({zid: zid}).exec())
  .then(function(d){
    if (!d || !d.length) return Promise.reject('country does not eixst')
    if (d.length > 1) return Promise.reject('country repeat')
    res.json(d[0])
  }).catch(function(err){
    res.json(500, {error: 'Cannot list the countries', err: err})
  })
}

var checkCountryExist = function(d){
  if (!d || !d._id) return Promise.reject('not a country')
  if (!d.zid) return Promise.reject('not a country')
  this.country = d
  return d
}
var checkCountryCityExist = function(d){
  this.countrycities = d
  return d
}

exports.editCountryNames = function(req, res){
  var info = req.body
  var zid = req.params.zid
  // var countryId = req.params.countryId

  info = _.pick(info, 'zns', 'sns', 'cns')


  Promise.bind({})
  .then(function(){
    return Promise.cast(Country.findOne({zid: zid}).exec()).bind(this).then(checkCountryExist)
  }).then(function(){
    return Promise.cast(City.find({zid: zid}).exec()).bind(this).then(checkCountryCityExist)
  }).then(function(){
    this.country.zns_ = info.zns
    this.country.save()
  }).then(function(){
    var zid = this.country.zid
    this.countrycities.map(function(d){
      if (d.zid && zid && zid.toString() === d.zid.toString()) {
        d.zns_ = info.zns
        d.save()
      }
    })
  }).then(function(d){
    res.json('good')
  }).catch(function(err){
    res.json(500, {error: 'Cannot list the countries', err: err})
  })
}


/**
 * autocomplete
 */
exports.autocompleteCountry = function(req, res) {
  if (!req.params.str || req.params.str.length < 3) return res.json([])

  return Promise.resolve()
  .then(function(){
    return Promise.cast(Country.find({'zn' : new RegExp('^'+req.params.str, 'i') }).lean().exec())
  }).then(function(d){
    d = _.compact(JSON.parse(JSON.stringify(d)).map(function(d){
      d.text = d.zn
      if (d.text) return d
    }))
    res.json(d)
  })
}



