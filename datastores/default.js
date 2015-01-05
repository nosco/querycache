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

Store.prototype.invalidate = function () {
  this._cache = {};
  this._cacheKeys = [];
};

Store.prototype.get = function (key) {
  return this._cache[JSON.stringify(key)];
};

Store.prototype.set = function (key, value) {
  if (this._cacheKeys.length >= this.maxEntries) {
    delete this._cache[this._cacheKeys.shift()];
  }
  var _key = JSON.stringify(key);
  this._cache[_key] = value;
  this._cacheKeys.push(_key);
  return value;
};

