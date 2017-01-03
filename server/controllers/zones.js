'use strict'

/**
 * Module dependencies.
 */
var mongoose = require('mongoose')
var Zone = mongoose.model('Zone')
var Promise = require('bluebird')
// var Market = mongoose.model('Market')
var City = mongoose.model('City')
var Country = mongoose.model('Country')
// var validator = require('validator')

// var hasAdminCountry = function(req, zid) {
//   // if (!zid) {
//   //   return Promise.resolve(false) // need at least one zid
//   // } else
//   if (zid && !req.user.isAdminCountry(zid)) {
//     return Promise.resolve(false)
//   } else {
//     return Promise.resolve(true)
//   }
// }

// var hasAdminState = function(req, sid) {
//   // if (!sid) {
//   //   return Promise.resolve(false) // need at least one sid
//   // } else
//   if (sid && !req.user.isAdminState(sid)) {
//     return Promise.reject(false)
//   } else {
//     return Promise.resolve(true)
//   }
// }

// var hasAdminCity = function(req, cid) {
//   // if (!sid) {
//   //   return Promise.resolve(false)
//   // } else
//   if (cid && !req.user.isAdminCity(cid)) {
//     return Promise.reject(false)
//   } else {
//     return Promise.resolve(true)
//   }
// }

/**
 * Show an zone
 */
exports.showcountry = function(req, res) {
  res.json(req.country)
}

exports.showstate = function(req, res) {
  res.json(req.state)
}

exports.getlonlatinfo = function(req, res) {
  var lon = req.params.longitude
  var lat = req.params.latitude

  return Zone.crawlGoogle(lon, lat)
  .then(function() {
    return Zone.getLonLatInfo(lon, lat)
  }).then(function(d) {
    res.json(d)
  }).catch(function(err) {
    console.log(err)
    res.json(500, {error: err.toString()})
  })
}

// var checkMarketCond = function(d) {
//   this.markets = JSON.parse(JSON.stringify(d))
//   return d
// }

// exports.findAvailableLocations = function(req, res) {
//   var lang = req.query.lang || 'en'

//   return Promise.bind({})
//   .then(function() {
//     return Promise.cast(Market.find().exec()).bind(this).then(checkMarketCond)
//   }).then(function() {
//     var markets = this.markets
//     return Promise.cast(Country.find({$or: [{zid: 35}]}).exec())
//     .map(function(d) {
//       var name
//       if (lang) {
//         name = d.zns_ && d.zns_[lang] || d.zn
//       }
//       var loc = {zid: d.zid, zn: name, childs : []}
//       return Promise.cast(City.find({zid: d.zid}).exec())
//       .map(function(d2) {
//         if (d2.sn && d2.status) {
//           var mks = []
//           markets.map(function(d3) {
//             if (~~d3.zid === ~~d.zid && ~~d3.sid === ~~d2.sid) mks.push(d3)
//           })
//           var name
//           if (lang) {
//             name = d2.sns_ && d2.sns_[lang] || d2.sn
//           }
//           loc.childs.push({sid: d2.sid, sn: name, markets: mks})
//         }
//       }).then(function() {
//         return loc
//       })
//     })
//   }).then(function(d) {
//     res.json(d)
//   }).catch(function(err) {
//     console.log(err)
//     res.json(500, {error: err.toString()})
//   })
// }

exports.setlonlatinfo = function(req, res) {

  var longitude = req.params.longitude
  var latitude = req.params.latitude
  var zname = req.body.zname
  var sname = req.body.sname
  var cname = req.body.cname
  var zid = null
  var sid = null
  var cid = null
  var status = null
  var _is_admin_dest = false

  if (!zname) return res.json(500, {error: 'not a valid country name'})
  if (!sname) return res.json(500, {error: 'not a valid state name'})

  var orig_zid = null
  var orig_sid = null
  var orig_cid = null
  var orig_status = null
  var _is_admin_orig = false

  return Promise.resolve()
  .then(function() {

    // check orig admin
    return Zone.getlonlatinfo(longitude, latitude)
    .then(function(d) {
      d = d && d.lats && d.lats[0] || {}
      orig_zid = d.zid
      orig_sid = d.sid
      orig_cid = d.cid
      orig_status = d.status
      return true
    })
  }).then(function() {
    return Country.get()
    .then(function(d) {
      if (!d || !d.length) return res.json(500, {error: 'zone info is incorrect...'})
      d.map(function(d) {
        if (d.zn === zname) zid = d.zid
      })
      if (!zid) return res.json(500, {error: 'country does not exist...'})
      return Promise.cast(City.find({zid: zid}).exec())
      .then(function(d) {
        if (!d || !d.length) return res.json(500, {error: 'country has no states ...'})
        d.map(function(d) {
          if (d.sn === sname) sid = d.sid
        })
      })
    })
  }).then(function() {
    if ((!orig_zid || !zid) && !req.user.isRootAdmin()) return Promise.reject('google says this point does not belong to a country, please contact root admin.')

    if (req.user.isAdminCountry(zid) && req.user.isAdminCountry(orig_zid)) return true

    if (!sid && !req.user.isRootAdmin()) return Promise.reject('not a valid state, you need to be a country admin to create a state ')

    if (!orig_sid  && !req.user.isRootAdmin()) {
      if (req.user.isAdminState(sid)) return true
      else return Promise.reject('not a valid state admin ')
    } else {

      return Promise.cast(City.findOne({sid: orig_sid}).exec())
      .then(function(d) {
        if (!req.user.isAdminState(sid)  && !req.user.isRootAdmin()) return Promise.reject('not a valid dest state admin ')

          // allow to modify empty orig state
        else if ((d && d.sn !== '') && !req.user.isAdminState(orig_sid)) return Promise.reject('not a valid orig state admin ')
        else return true
      })

    }
  }).then(function() {
    return Zone.setlonlatinfo(longitude, latitude, zname, sname, cname)
    .then(function(d) {
      res.json(d)
    })
  }).catch(function(err) {
    res.json(500, {error: err.toString()})
  })
}
