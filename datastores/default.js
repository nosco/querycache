var DEFAULT_MAX_ENTRIES = (process.env.QC_MAX_ENTRIES)?
                          parseInt(process.env.QC_MAX_ENTRIES, 10):
                          100000;

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

  this._cache = {};
  this._cacheKeys = [];

}

Store.prototype.invalidate = function (callback) {
  this._cache = {};
  this._cacheKeys = [];
  callback();
};

Store.prototype.get = function (key, callback) {
  callback(null, this._cache[key] || null);
};

Store.prototype.set = function (key, value, callback) {
  if (this._cacheKeys.length >= this.maxEntries) {
    delete this._cache[this._cacheKeys.shift()];
  }
  this._cache[key] = value;
  this._cacheKeys.push(key);
  callback(null, value);
};

