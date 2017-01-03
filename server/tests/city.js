/*jshint -W079 */
'use strict'

/**
 * Module dependencies.
 */
var Promise = require('bluebird')
var should = require('should')
var mongoose = require('mongoose')
var City = mongoose.model('City')
var Country = mongoose.model('Country')
var _ = require('lodash')
var randomstring = require('randomstring')

/**
 * Globals
 */
var numRepeat = 50
var numCountries = 2
var numStates = 4
var numCities = 5

var states = []
var countries = []
var savedstates = []
var savedcountries = []

var genCountry = function() {
  return {
    zn: randomstring.generate()
  }
}

var genCities = function() {
  return _.range(numCities)
  .map(function() {
    return {
      cn: randomstring.generate(),
      lon: randomstring.generate({
        charset: 'numeric'
      }) % 180,
      lat: randomstring.generate({
        charset: 'numeric'
      }) % 180 - 90
    }
  }).sort()
}

var genState = function(zname) {
  return {
    zn: zname,
    sn: randomstring.generate(),
    cities: genCities()
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
        return Promise.cast(City.remove().exec())
      }).then(function() {
        return Promise.resolve(_.range(numCountries))
        .map(function(d, i) {
          countries[i] = genCountry()
        })
      }).then(function() {
        return Promise.resolve(countries)
        .map(function(d1, i1) {
          states[i1] = []
          return Promise.resolve(_.range(numStates))
          .map(function(d2, i2) {
            states[i1][i2] = genState(d1.zn)
            if (i2 === 2) {
              states[i1][i2].sn = ''
              states[i1][i2].cities = []
            }
            if (i2 === 3) {
              states[i1][i2].cities = []
            }
          })
        })
      }).then(function() {
        return Promise.resolve(countries)
        .map(function(d, i) {
          return Country.__insert(d.zn).then(function(d) {
            savedcountries[i] = JSON.parse(JSON.stringify(d))
          })
        }, {concurrency: 1})
      }).then(function() {
        done()
      }).catch(function(err) {
        should.not.exist(err)
        done()
      })
    })

    describe('Method insert', function() {
      it('should be able to insert a country and state correctly (__createCountryState)', function(done) {
        return Promise.resolve(countries)
        .map(function(d1, i1) {
          savedstates[i1] = []
          return Promise.resolve(states[i1])
          .map(function(d, i) {
            return City.__createCountryState(d.zn, d.sn)
            .then(function(d) {
              savedstates[i1][i] = JSON.parse(JSON.stringify(d))
            })
          }, {concurrency: 1})
        }, {concurrency: 1})
        .then(function() {
          return Promise.resolve(savedcountries)
          .map(function(d, i) {
            return City.getStates(d.zid).then(function(d) {
              d.length.should.equal(numStates)
            })
          }, {concurrency: 1})
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

      it('should pass silently when inserting a duplicate country and state (__createCountryState)', function(done) {
        var state = savedstates[0][0]
        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          return City.__createCountryState(state.zn, state.sn)
        }, {concurrency: 1})
        .then(function() {
          return City.getStates(state.zid).then(function(d) {
            d.length.should.equal(numStates)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

      it('should be able to insert a country and state correctly (createCountryStateCity)', function(done) {
        return Promise.resolve(countries) // 2
        .map(function(d1, i1) {
          return Promise.resolve(states[i1]) // 4
          .map(function(d2, i2) {
            return Promise.resolve(d2.cities)
            .map(function(d3, i3) {
              return City.createCountryStateCity(d2.zn, d2.sn, d3.cn, d3.lon, d3.lat)
            }, {concurrency: 1})
          }, {concurrency: 1})
        }, {concurrency: 1})
        .then(function() {
          return Promise.resolve(savedcountries)
          .map(function(d, i) {
            return City.getStates(d.zid).then(function(d) {
              d.length.should.equal(numStates)
            })
          }, {concurrency: 1})
        }).then(function() {
          return Promise.resolve(savedcountries)
          .map(function(d1, i1) {
            return Promise.resolve(savedstates[i1])
            .map(function(d, i) {
              return City.getCities(d.sid).then(function(d) {
                if (i === 2) d.length.should.equal(0)
                else if (i === 3) d.length.should.equal(0)
                else d.length.should.equal(numCities)
              })
            }, {concurrency: 1})
          }, {concurrency: 1})
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

      it('should pass silently when inserting a duplicate country, state and city (createCountryStateCity)', function(done) {
        var state = savedstates[0][0]
        var cn = states[0][0].cities[0].cn

        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          return City.createCountryStateCity(state.zn, state.sn, cn, lon, lat)
        }, {concurrency: 1})
        .then(function() {
          return City.getStates(state.zid).then(function(d) {
            d.length.should.equal(numStates)
            var dd = d.filter(function(d) {
              return d.sn === state.sn
            })[0]
            dd.locs.length.should.equal(numCities + numRepeat)
          })
        }).then(function() {
          return City.getCities(state.sid).then(function(d) {
            d.length.should.equal(numCities)
            var dd = d.filter(function(d) {
              return d.cn === cn
            })[0]
            dd.locs.length.should.equal(1 + numRepeat)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

      it('should fail to insert cname with no sname (createCountryStateCity)', function(done) {
        var state = savedstates[0][0]
        var cn = states[0][0].cities[0].cn

        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          return City.createCountryStateCity(state.zn, '', cn, lon, lat).reflect()
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
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

    })

    describe('Method get', function() {
      it('should be able to get max number of states (getMaxSid)', function(done) {
        return City.getMaxSid()
        .then(function(d) {
          should.exist(d)
          d.should.equal(numCountries * numStates)
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should be able to get max # of cities (getMaxCid)', function(done) {
        return City.getMaxCid()
        .then(function(d) {
          d.should.equal(numCountries * (numStates - 2) * numCities)
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })
    })

    after(function(done) {
      return Promise.resolve()
      .then(function() {
        return Promise.cast(City.find().remove().exec())
      }).then(function() {
        return Promise.cast(Country.find().remove().exec())
      }).then(function() {
        countries = []
        savedcountries = []
        done()
      }).catch(function(err) {
        console.log(err.stack)
        should.not.exist(err)
        done()
      })
    })
  })
})
