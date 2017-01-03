/*jshint -W079 */
'use strict'

/**
 * Module dependencies.
 */
var Promise = require('bluebird')
var should = require('should')
// var path = require('path')
var mongoose = require('mongoose')
var City = mongoose.model('City')
var Zone = mongoose.model('Zone')
var Country = mongoose.model('Country')
var _ = require('lodash')
// var config = require('meanio').loadConfig()
var randomstring = require('randomstring')

/**
 * Globals
 */

// var numGoogle = 1
var numRepeat = 10
var numCountrys = 2
var numStates = 4
var numCities = 5

var states = []
var countries = []
// var savedstates = []
var savedcountries = []

var zones = []
// var savedzones = []

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
  describe('Model Zone:', function() {
    this.timeout(8000)

    before(function(done) {
      return Promise.resolve()
      .then(function() {
        return Promise.cast(Country.remove().exec())
      }).then(function() {
        return Promise.cast(City.remove().exec())
      }).then(function() {
        return Promise.cast(Zone.remove().exec())
      }).then(function() {
        return Promise.resolve(_.range(numCountrys))
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
        return Promise.resolve(countries) // 2
        .map(function(d1, i1) {
          return Promise.resolve(states[i1]) // 4
          .map(function(d2, i2) {
            if (d2.cities.length) {
              return Promise.resolve(d2.cities)
              .map(function(d3, i3) {
                return City.createCountryStateCity(d2.zn, d2.sn, d3.cn, d3.lon, d3.lat)
              }, {concurrency: 1})
            } else {
              return City.__createCountryState(d2.zn, d2.sn)
            }
          }, {concurrency: 1})
        }, {concurrency: 1})
      }).then(function() {
        done()
      }).catch(function(err) {
        should.not.exist(err)
        done()
      })
    })

    describe('Method insert', function() {
      it('should insert new country, new state, new city into zone collection (_insertCountryStateCity)', function(done) {
        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var zn = randomstring.generate()
          var sn = randomstring.generate()
          var cn = randomstring.generate()
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          zones[i] = {
            zn: zn,
            sn: sn,
            cn: cn,
            lon: lon,
            lat: lat
          }
          return Zone._insertCountryStateCity(zn, sn, cn, lon, lat, 1)
        }, {concurrency: 1})
        .then(function() {
          return City.getMaxSid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * numStates)
          })
        }).then(function() {
          return City.getMaxCid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * (numStates - 2) * numCities)
          })
        }).then(function() {
          return Promise.resolve(zones)
          .map(function(d, i) {
            return Zone.getLonLatInfo(d.lon, d.lat)
            .then(function(d) {
              d.zn.should.equal(zones[i].zn)
              d.sn.should.equal(zones[i].sn)
              d.cn.should.equal(zones[i].cn)
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

      it('should pass silently when old country, state, city insert into zone collection (_insertCountryStateCity)', function(done) {
        return Promise.resolve(zones)
        .map(function(d, i) {
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          return Zone._insertCountryStateCity(d.zn, d.sn, d.cn, lon, lat, 1)
        }, {concurrency: 1})
        .then(function() {
          return City.getMaxSid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * numStates)
          })
        }).then(function() {
          return City.getMaxCid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * (numStates - 2) * numCities)
          })
        }).then(function() {
          return Promise.resolve(zones)
          .map(function(d, i) {
            return Zone.getLonLatInfo(d.lon, d.lat)
            .then(function(d) {
              d.zn.should.equal(zones[i].zn)
              d.sn.should.equal(zones[i].sn)
              d.cn.should.equal(zones[i].cn)
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

      it('should insert old country, new state, new city into zone collection (_insertCountryStateCity)', function(done) {
        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var zn = savedcountries[0].zn
          var sn = randomstring.generate()
          var cn = randomstring.generate()
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          zones[i] = {
            zn: zn,
            sn: sn,
            cn: cn,
            lon: lon,
            lat: lat
          }
          return Zone._insertCountryStateCity(zn, sn, cn, lon, lat, 1)
        }, {concurrency: 1})
        .then(function() {
          return City.getMaxSid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * numStates + numRepeat)
          })
        }).then(function() {
          return City.getMaxCid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * (numStates - 2) * numCities + numRepeat)
          })
        }).then(function() {
          return Promise.resolve(zones)
          .map(function(d, i) {
            return Zone.getLonLatInfo(d.lon, d.lat)
            .then(function(d) {
              d.zn.should.equal(zones[i].zn)
              d.sn.should.equal(zones[i].sn)
              d.cn.should.equal(zones[i].cn)
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

      it('should insert old country, old state, new city into zone collection (_insertCountryStateCity)', function(done) {
        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var zn = savedcountries[0].zn
          var sn = states[0][0].sn
          var cn = randomstring.generate()
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          zones[i] = {
            zn: zn,
            sn: sn,
            cn: cn,
            lon: lon,
            lat: lat
          }
          return Zone._insertCountryStateCity(zn, sn, cn, lon, lat, 1)
        }, {concurrency: 1})
        .then(function() {
          return City.getMaxSid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * numStates + numRepeat)
          })
        }).then(function() {
          return City.getMaxCid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * (numStates - 2) * numCities + numRepeat + numRepeat)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

      it('should insert old country, old state, old city into zone collection (_insertCountryStateCity)', function(done) {
        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var zn = savedcountries[0].zn
          var sn = states[0][0].sn
          var cn = states[0][0].cities[0].cn
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          zones[i] = {
            zn: zn,
            sn: sn,
            cn: cn,
            lon: lon,
            lat: lat
          }
          return Zone._insertCountryStateCity(zn, sn, cn, lon, lat, 1)
        }, {concurrency: 1})
        .then(function() {
          return City.getMaxSid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * numStates + numRepeat)
          })
        }).then(function() {
          return City.getMaxCid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * (numStates - 2) * numCities + numRepeat + numRepeat)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })

      it('should insert old country, old state, no city into zone collection (_insertCountryStateCity)', function(done) {
        return Promise.resolve(_.range(numRepeat))
        .map(function(d, i) {
          var zn = savedcountries[0].zn
          var sn = states[0][0].sn
          var cn = ''
          var lon = Math.random() * 90
          var lat = Math.random() * 90
          zones[i] = {
            zn: zn,
            sn: sn,
            cn: cn,
            lon: lon,
            lat: lat
          }
          return Zone._insertCountryStateCity(zn, sn, cn, lon, lat, 1)
        }, {concurrency: 1})
        .then(function() {
          return City.getMaxSid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * numStates + numRepeat)
          })
        }).then(function() {
          return City.getMaxCid()
          .then(function(d) {
            d.should.equal(numRepeat + numCountrys * (numStates - 2) * numCities + numRepeat + numRepeat)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          console.log(err.stack)
          should.not.exist(err)
          done()
        })
      })
    })

    describe('Method get', function() {
      it('should be able to crawl a new point (crawlGoogle)', function(done) {
        var lon = 121.6
        var lat = 25.03
        return Zone.crawlGoogle(lon, lat)
        .then(function() {
          return Zone.getLonLatInfo(lon, lat)
          .then(function(d) {
            d.status.should.equal(1)
            d.zn.should.equal('Taiwan')
            d.sn.should.equal('Taipei City')
            d.cn.should.equal('')
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should be able to crawl a ZERO_RESULTS point (crawlGoogle)', function(done) {
        var lon = 121.6
        var lat = 20.03
        return Zone.crawlGoogle(lon, lat)
        .then(function(d) {
          return Zone.getLonLatInfo(lon, lat)
          .then(function(d) {
            // this point is in the sea
            d.status.should.equal(-1)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should be able to crawl a new point (crawlGoogle)', function(done) {
        var lon = -86.5861
        var lat = 34.73
        return Zone.crawlGoogle(lon, lat)
        .then(function() {
          return Zone.getLonLatInfo(lon, lat)
          .then(function(d) {
            d.status.should.equal(1)
            d.zn.should.equal('United States')
            d.sn.should.equal('Alabama')
            d.cn.should.equal('Huntsville')
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should fail to crawl when lon, lat format is not correct (crawlGoogle)', function(done) {
        var lon = -86.5861
        var lat = 34.73
        return Zone.crawlGoogle(lon, 'a')
        .then(function() {
          return Zone.getLonLatInfo(lon, lat)
        }).catch(function(err) {
          should.exist(err)
          done()
        })
      })

      it('should fail to crawl when a wrong key is provided (crawlGoogle)', function(done) {
        var lon = 116.5861
        var lat = 35.73
        var wrongkeys = [
          randomstring.generate(),
          randomstring.generate()
        ]
        Zone.setKeys(wrongkeys)

        return Promise.resolve()
        .then(function() {
          return Zone.crawlGoogle(lon, lat)
          .then(function(d) {
            d.status.should.equal(-100)
            d.error.should.equal('The provided API key is invalid.')
          })
        }).then(function() {
          return Zone.crawlGoogle(lon, lat)
          .then(function(d) {
            d.status.should.equal(-100)
            d.error.should.equal('The provided API key is invalid.')
          })
        }).then(function() {
          return Zone.crawlGoogle(lon, lat)
          .then(function(d) {
            d.status.should.equal(1)
          })
        }).then(function() {
          done()
        }).catch(function(err) {
          should.not.exist(err)
          done()
        })
      })

      it('should be able to setLonLatinfo an existing point (setLonLatinfo)', function(done) {
        var lon = -86.5861
        var lat = 34.73
        return Zone.setLonLatinfo(lon, lat, 'United States', 'Alabama', 'Huntsville2')
        .then(function() {
          return Zone.getLonLatInfo(lon, lat)
          .then(function(d) {
            d.status.should.equal(100)
            d.zn.should.equal('United States')
            d.sn.should.equal('Alabama')
            d.cn.should.equal('Huntsville2')
          })
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
        return Promise.cast(Zone.find().remove().exec())
      }).then(function() {
        zones = []
        countries = []
        // savedzones = []
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
