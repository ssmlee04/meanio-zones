/*jshint -W079 */
'use strict'

/**
 * Module dependencies.
 */

var Promise = require('bluebird')
var _ = require('lodash')
var mongoose = require('mongoose')
var Country = mongoose.model('Country')
var City = mongoose.model('City')

var checkCountryExist = function(d) {
  if (!d || !d._id) {
    return Promise.reject('text-error-country')
  }
  if (!d.zid) {
    return Promise.reject('text-error-country')
  }
  this.country = d
  return d
}

var checkCountryCityExist = function(d) {
  this.countrycities = d
  return d
}


/**
 * List states under one zid
 */
exports.findStates = function(req, res) {
  var lang = req.query.lang
  return Promise.cast(City.find({zid: req.params.zid}, {locs:0, cities:0}).sort('sn').exec())
  .then(function(d) {
    d = JSON.parse(JSON.stringify(d))
    var isTaipei = 0
    if (lang) {
      d = d.map(function(d, i) {
        var j = i
        if (d.sn === 'Taipei City') {
          isTaipei = j
        }
        d.zn = (d.zns_ && d.zns_[lang]) || d.zn
        d.sn = (d.sns_ && d.sns_[lang]) || d.sn
        delete d.mcid
        delete d.sns_
        delete d.zns_
        delete d._id
        delete d.__v
        delete d.sn_local
        delete d.zn_local
        return d
      })
    }
    var temp = JSON.parse(JSON.stringify(d[0]))
    d[0] = JSON.parse(JSON.stringify(d[isTaipei]))
    d[isTaipei] = temp
    return res.json(d)
  }).catch(function(err) {
    return res.json(500, {error: 'Cannot list the states for some reason wtf'})
  })
}

/**
 * List cities under sid
 */
exports.findCities = function(req, res) {
  var lang = req.query.lang
  Promise.cast(City.findOne({sid: req.params.sid}).exec())
  .then(function(d) {
    var cities = JSON.parse(JSON.stringify(d)).cities || []
    if (lang) {
      cities = cities.map(function(d) {
        d.cn = d.cn || (d.cns_ && d.cns_[lang])
        delete d.cn_local
        delete d.locs
        delete d.cns_
        return d
      })
    }
    return res.json(cities)
  }).catch(function(err) {
    return res.json(500, {error: 'Cannot list the states', err: err})
  })
}

/**
 * autocomplete
 */
exports.autocompleteState = function(req, res) {
  if (!req.params.str || req.params.str.length < 3) {
    return res.json([])
  }

  return Promise.resolve()
  .then(function() {
    return Promise.cast(City.find({'sn' : new RegExp('^'+req.params.str, 'i') }).lean().exec())
  }).then(function(d) {
    d = JSON.parse(JSON.stringify(d)).map(function(d) {
      d.text = d.zn + ',' + d.sn
      return d
    })
    res.json(d)
  })
}

exports.findState = function(req, res) {
  var zid = req.params.zid
  var sid = req.params.sid

  Promise.cast(City.find({zid: zid, sid: sid}).exec())
  .then(function(d) {
    if (!d || !d.length) {
      return Promise.reject('country does not eixst')
    }
    if (d.length > 1) {
      return Promise.reject('country repeat')
    }
    res.json(d[0])
  }).catch(function(err) {
    console.log(err)
    res.json(500, {error: 'Cannot list the countries', err: err})
  })
}

exports.findCity = function(req, res) {
  res.json('wtf')
}

exports.editStateNames = function(req, res) {
  var info = req.body
  var zid = req.params.zid
  var sid = req.params.sid
  info = _.pick(info, 'zns', 'sns', 'cns')

  Promise.bind({})
  .then(function() {
    return Promise.cast(Country.findOne({zid: zid}).exec()).bind(this).then(checkCountryExist)
  }).then(function() {
    return Promise.cast(City.find({zid: zid, sid: sid}).exec()).bind(this).then(checkCountryCityExist)
  }).then(function() {
    this.countrycities.map(function(d) {
      if (d.zid && zid && zid.toString() === d.zid.toString() &&
        d.sid && sid && sid.toString() === d.sid.toString()) {
        d.sns_ = info.sns
        d.save()
      }
    })
  }).then(function() {
    res.json('good')
  }).catch(function(err) {
    res.json(500, {error: 'Cannot list the countries', err: err})
  })
}




exports.editCityNames = function(req, res) {
  var info = req.body
  var zid = req.params.zid
  var sid = req.params.sid
  var cid = req.params.cid

  info = _.pick(info, 'zns', 'sns', 'cns')


  Promise.bind({})
  .then(function() {
    return Promise.cast(Country.findOne({zid: zid}).exec()).bind(this).then(checkCountryExist)
  }).then(function() {
    return Promise.cast(City.find({zid: zid, sid: sid}).exec()).bind(this).then(checkCountryCityExist)
  }).then(function() {
    this.countrycities.map(function(d) {
      var ifChanged = false
      if (d.zid && zid && zid.toString() === d.zid.toString() &&
        d.sid && sid && sid.toString() === d.sid.toString()) {
        // cid inside this
        d.cities = (d.cities || []).map(function(d1) {
          if (d1.cid && cid && cid.toString() === d1.cid.toString()) {
            ifChanged = true
            d1.cns_ = info.cns
          }
          return d1
        })
        if (ifChanged) {
          d.save()
        }
      }
    })
  }).then(function() {
    res.json('good')
  }).catch(function(err) {
    res.json(500, {error: 'Cannot list the countries', err: err})
  })
}


exports.autocompleteCity = function(req, res) {
  if (!req.params.str || req.params.str.length < 3) {
    return res.json([])
  }

  var cities = []
  return Promise.resolve()
  .then(function() {
    return Promise.cast(City.find({'cities.cn' : new RegExp('^'+req.params.str, 'i') }, {}, {limit: 10}).lean().exec())
  }).map(function(d) {

    var country = d.zn
    var state = d.sn
    d.cities.map(function(e) {
      if (e.cn && e.cn.indexOf(req.params.str) !== -1) {
        cities.push({
          text: country + ', ' + state + ', ' + e.cn,
          cid : e.cid
        })
      }
    })
  }).then(function() {
    res.json(cities)
  }).catch(function(err){
    res.status(500).json({error: 'something is wrong...'})
  })
}




