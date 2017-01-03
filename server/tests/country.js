/*jshint -W079 */
'use strict'

/**
 * Module dependencies.
 */
var Promise = require('bluebird')
var should = require('should')
var path = require('path')
var mongoose = require('mongoose')
var Country = mongoose.model('Country')
var _ = require('lodash')
var config = require('meanio').loadConfig()
var randomstring = require('randomstring')

/**
 * Globals
 */

var numCountrys = 30
var countries = []
var savedcountries = []

var genCountry = function() {
  return {
    zn: randomstring.generate()
  }
}

/**
 * Test Suites
 */
describe('<Unit Test>', function() {
  describe('Model Country:', function() {
    this.timeout(8000)

    before(function(done) {
      return Promise.resolve()
      .then(function() {
        return Promise.cast(Country.remove().exec())
      }).then(function() {
        return Promise.resolve(_.range(numCountrys))
        .map(function(d, i) {
          countries[i] = genCountry()
        })
      }).then(function() {
        done()
      })
    })

    describe('Method insert', function() {
      it('should be able to insert something correctly (__insert)', function(done) {
        return Promise.resolve(countries)
        .map(function(d, i) {
          return Country.__insert(d.zn).then(function(d) {
            savedcountries[i] = JSON.parse(JSON.stringify(d))
            return savedcountries[i]
          })
        }, {concurrency: 1})
        .then(function(d) {
          should.exist(d)
          var zids = d.map(function(d) {
            return d.zid
          })
          zids.length.should.equal(numCountrys)
          _.compact(_.uniq(zids)).length.should.equal(numCountrys)
          return d
        }).map(function(d, i) {
          d.zn.should.equal(countries[i].zn)
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('won\'t insert a duplicate country name (__insert)', function(done) {
        return Promise.resolve(_.range(numCountrys))
        .map(function() {
          return Promise.cast(Country.create({name: countries[0].zn})).reflect()
          .then(function(d) {
            if (d.isFulfilled()) {
              should.not.exist(true)
            } else {
              should.exist(true)
            }
          })
        }, {concurrency: 1})
        .then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('won\'t insert a duplicate country id (__insert)', function(done) {
        return Promise.resolve(_.range(numCountrys))
        .map(function() {
          return Promise.cast(Country.create({id: savedcountries[0].zid})).reflect()
          .then(function(d) {
            if (d.isFulfilled()) {
              should.not.exist(true)
            } else {
              should.exist(true)
            }
          })
        }, {concurrency: 1})
        .then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should pass silently when insert a duplicate country name (__insert)', function(done) {
        return Promise.resolve(_.range(numCountrys))
        .map(function() {
          return Country.__insert(countries[0].zn)
        }, {concurrency: 1})
        .then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })
    })

    describe('Method get', function() {
      it('should be able to get list of countries (get)', function(done) {
        return Country.get()
        .then(function(d) {
          should.exist(d)
          d.length.should.equal(numCountrys)
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should be able to get max # of countries (getMaxZid)', function(done) {
        return Country.getMaxZid()
        .then(function(d) {
          d.should.equal(numCountrys)
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })
    })

    after(function(done) {
      return Promise.resolve(savedcountries).map(function(d) {
        return Promise.cast(Country.find({_id: d._id}).remove().exec())
      }).then(function() {
        return Promise.cast(Country.find({}).exec())
        .then(function(d) {
          d.should.have.length(0)
        })
      }).then(function() {
        countries = []
        savedcountries = []
        done()
      }).catch(function(err) {
        should.not.exist(err)
        done()
      })
    })
  })
})
