var test = require('tap').test;
var async = require('async');
var Store = require('../datastores/default');

test('Honour the MAX_ENTRIES bound', function (t) {
  var maxEntries = 2;
  var cache = new Store({maxEntries: maxEntries});

  var setCache = [];
  for (var i=1;i<5;i++) {
    setCache.push((function (i) {
      return function (next) {
        cache.set(i, i, next);
      };
    })(i));
  }
  async.series(setCache, function (err) {
    if (err) throw err;
    var entries = Object.keys(cache._cache).length;
    t.equal(entries, maxEntries, 'Correct number of entries: ' + maxEntries);
    t.end();
  });
});

test('When MAX_ENTRIES is reached, remove oldest entry', function (t) {
  var cache = new Store({maxEntries: 2});
  async.series([
    cache.set.bind(cache, 'key1', 'val1'),
    cache.set.bind(cache, 'key2', 'val2'),
    cache.set.bind(cache, 'key3', 'val3')], allSet);
  function allSet(err) {
    if (err) throw err;
    async.series([
      cache.get.bind(cache, 'key1'),
      cache.get.bind(cache, 'key2'),
      cache.get.bind(cache, 'key3')], done);
    function done(err, values) {
      if (err) throw err;
      t.equal(values[0], null, 'Oldest entry removed');
      t.equal(values[1], 'val2', 'Second entry intact');
      t.equal(values[2], 'val3', 'Third entry intact');
      t.end();
    }
  }
});

test('QueryCache#maxEntries is set correctly', function (t) {
  var cache = new Store();
  t.equal(cache.maxEntries, 100000, 'Default is 100000');

  process.env.QC_MAX_ENTRIES = '10';
  delete require.cache[require.resolve('../datastores/default')];
  Store = require('../datastores/default');
  cache = new Store();
  t.equal(cache.maxEntries, 10, 'Can be set by env var');

  cache = new Store({maxEntries: 20});
  t.equal(cache.maxEntries, 20, 'Can be set by constructor');
  t.end();
});
