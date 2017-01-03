"use strict";

module.exports = {
  server: "http://localhost:3000",
  mongodb: {
    db: "mongodb://127.0.0.1:27017/meanio-test",
    dbOptions: {
      user: "",
      pass: ""
    }
  },
  debug: true,
  aggregate: true,
  mongoose: {
    debug: false
  },
  app: {
    name: ""
  }
};
