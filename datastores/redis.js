var redis = require('redis');
var async = require('async');

var DEFAULT_MAX_ENTRIES = (process.env.QC_MAX_ENTRIES)?
                          parseInt(process.env.QC_MAX_ENTRIES, 10):
                          100000;

var PORT = process.env.QC_REDIS_PORT || 6379;
var HOST = process.env.QC_REDIS_HOST || '127.0.0.1';

module.exports = Store;

function Store(options) {
  options = options || {};

  // The maximum number of allowed entries in cache can be specified either by
  // environmental variable QC_MAX_ENTRIES or the maxEntries option to
  // the constructor, which gets prioritized over QC_MAX_ENTRIES.
  this.maxEntries = DEFAULT_MAX_ENTRIES;
  if (options.maxEntries) {
    this.maxEntries = options.maxEntries;
  }

  this._cacheKeys = [];

  this.namespace = options.namespace;

  options.config = options.config || {};

  var port = options.config.port || PORT;
  var host = options.config.host || HOST;
  var redisOptions = options.config.redisOptions;

  this.client = redis.createClient(port, host, redisOptions);
}

Store.prototype.invalidate = function (callback) {
  var self = this;

  self._cacheKeys = [];
  self.client.keys(self.namespace + '*', function (err, keys) {
    if (err) return callback(err);
    async.each(keys, function (key, cb) {
      self.client.del(key, cb);
    }, callback);
  });
};

Store.prototype.get = function (key, callback) {
  var _key = this.namespace + '::' + JSON.stringify(key);
  this.client.get(_key, callback);
};

Store.prototype.set = function (key, value, callback) {
  var self = this;

  var _key = self.namespace + '::' + JSON.stringify(key);

  if (self._cacheKeys.length >= self.maxEntries) {
    self.client.del(self._cacheKeys.shift(), save);
  } else {
    save();
  }

  function save(err) {
    if (err) return callback(err);
    self._cacheKeys.push(_key);
    self.client.set(_key, value, callback);
  }
};
