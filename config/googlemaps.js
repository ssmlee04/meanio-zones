var Promise = require('bluebird')
var gm      = require('googlemaps')
// gm.config('console-key', process.env.GOOGLE_MAP_APIKEY)

var nextOnOverQueryLimit = function(d) {
  if (d.status === 'OVER_QUERY_LIMIT' || d.status === 'REQUEST_DENIED') {
    this.nextKey()
  }
  return d
}

var googlemaps = function() {
  var currentIndex = 0
  var keys = [process.env.GOOGLE_MAP_APIKEY || '', '']
  var nextKey = function() {
    currentIndex = (currentIndex + 1) % keys.length
    console.log('nextKey : ' + keys[currentIndex])
    gm.config('console-key', keys[currentIndex])
    gm.config('secure', 'true')
  }
  return {
    nextKey : function() {
      nextKey()
    },
    addKey: function(key) {
      if (keys.indexOf(key) === -1) {
        keys = keys.concat([key])
      }
    },
    setKeys: function(ks) {
      if (!ks || !ks.length) {
        return
      }

      keys = [''].concat(ks || [])
      nextKey()
    },
    geocode: function(addr) {
      return Promise.promisify(gm.geocode)(addr)
      .then(nextOnOverQueryLimit.bind(this))
    },
    reverseGeocode : function(lon, lat) {
      return Promise.promisify(gm.reverseGeocode.bind(gm))(lat + ',' + lon)
      .then(nextOnOverQueryLimit.bind(this))
    }
  }
}

module.exports = exports = new googlemaps()

