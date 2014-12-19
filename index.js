'use strict';

var mongo = require('mongodb').MongoClient;
var Timestamp = require('mongodb').Timestamp;

var EventEmitter = require('events').EventEmitter;
var eventbus = new EventEmitter();
eventbus.setMaxListeners(0);

var URI = process.env.QUERYCACHE_URI || 'mongodb://127.0.0.1:27017/local';

var DEFAULT_MAX_ENTRIES = (process.env.QUERYCACHE_MAX_ENTRIES)?
                          parseInt(process.env.QUERYCACHE_MAX_ENTRIES, 10):
                          100000;

module.exports = QueryCache;
QueryCache._eventbus = eventbus;

var connectionEstablished = false;

function QueryCache(options) {
  var self = this;
  options = options || {};

  if (!options.collections) throw new Error('No collections specified!');
  if (!options.dbName) throw new Error('No database specified!');

  self.dbName = options.dbName;
  self.collections = options.collections;

  // The maximum number of allowed entries in cache can be specified either by
  // environmental variable QUERYCACHE_MAX_ENTRIES or the maxEntries option to
  // the constructor, which gets prioritized over QUERYCACHE_MAX_ENTRIES.
  self.maxEntries = DEFAULT_MAX_ENTRIES;
  if (options.maxEntries) {
    self.maxEntries = options.maxEntries;
  }

  self._cache = {};
  self._cacheKeys = [];

  self.enabled = connectionEstablished;

  // Register event listeners
  self.collections.forEach(function (collection) {
    eventbus.on(self.dbName + '.' + collection, self.invalidate.bind(self));
  });
  eventbus.on(self.dbName + '.$cmd', self.invalidate.bind(self));

  eventbus.on('enable', self.enable.bind(self));
  eventbus.on('disable', self.disable.bind(self));

}

QueryCache.prototype.disable = function () {
  this.enabled = false;
};

QueryCache.prototype.enable = function () {
  this.enabled = true;
};

QueryCache.prototype.invalidate = function () {
  this._cache = {};
  this._cacheKeys = [];
};

QueryCache.prototype.get = function (key) {
  if (connectionEstablished && this.enabled) {
    return this._cache[JSON.stringify(key)];
  }
};

QueryCache.prototype.set = function (key, value) {
  if (connectionEstablished && this.enabled) {
    if (this._cacheKeys.length >= this.maxEntries) {
      delete this._cache[this._cacheKeys.shift()];
    }
    var _key = JSON.stringify(key);
    this._cache[_key] = value;
    this._cacheKeys.push(_key);
    return value;
  }
};

eventbus.on('enable', function () {connectionEstablished = true;});
eventbus.on('disable', function () {connectionEstablished = false;});

if (process.env.QUERYCACHE_ENABLE === 'true') {
  mongo.connect(URI, function (err, db) {
    if (err) {
     console.log('Could not enable cache!!');
     console.log(URI);
     return console.log(err);
    }
    var cursorOptions = {
      tailable: true,
      numberOfRetries: -1
    };
    var oplog = db.collection('oplog.rs');

    // silly mongo driver seems to have made a switcheroo on the Timestamp
    // argument order
    var now = new Timestamp(0, Date.now()/1000)

    var stream = oplog.find({ts: {$gt: now}}, {ns: 1}, cursorOptions)
                      .sort({$natural: -1}).stream();
    // start caching
    eventbus.emit('enable');
    stream.on('data', function (doc) {
      eventbus.emit(doc.ns);
    });
    stream.on('end', function () {
      console.log('Oplog stream ended - disabling cache');
      eventbus.emit('disable');
    });
    stream.on('error', function (err) {
      console.error(err);
      eventbus.emit('disable');
    });
  });
}
