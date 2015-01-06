'use strict';

var mongo = require('mongodb').MongoClient;
var Timestamp = require('mongodb').Timestamp;

var EventEmitter = require('events').EventEmitter;
var eventbus = new EventEmitter();
eventbus.setMaxListeners(0);

var URI = process.env.QC_URI || 'mongodb://127.0.0.1:27017/local';


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

  self.enabled = connectionEstablished;

  var datastore = options.datastore || 'default';
  var Store = require('./datastores/' + datastore);
  self.cache = new Store({
    maxEntries: options.maxEntries,
    namespace: options.namespace || 'QueryCache|' + self.dbName,
    config: options.config
  });

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

QueryCache.prototype.invalidate = function (callback) {
  var self = this;

  var errorHandler = callback || console.error;
  callback = callback || function () {};

  self.disable();
  self.cache.invalidate(function (err) {
    if (err) errorHandler(err);
    else {
      self.enable();
      callback();
    }
  });
};

QueryCache.prototype.get = function (key, callback) {
  if (connectionEstablished && this.enabled) {
    this.cache.get(key, callback);
  }
};

QueryCache.prototype.set = function (key, value, callback) {
  if (connectionEstablished && this.enabled) {
    this.cache.set(key, value, callback);
  }
};

eventbus.on('enable', function () {connectionEstablished = true;});
eventbus.on('disable', function () {connectionEstablished = false;});

if (process.env.QC_ENABLE === 'true') {
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
