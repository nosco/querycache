var test = require('tap').test;
var Store = require('../datastores/default');

test('Honour the MAX_ENTRIES bound', function (t) {
  var maxEntries = 2;
  var cache = new Store({maxEntries: maxEntries});
  var entries;
  for (var i=1;i<5;i++) {
    cache.set(i, i);
    entries = Object.keys(cache._cache).length;
    if (i>maxEntries) {
      t.equal(entries, maxEntries, 'Correct number of entries: ' + maxEntries);
    } else {
      t.equal(entries, i, 'Correct number of entries: ' + i);
    }
  }
  t.end();
});
test('When MAX_ENTRIES is reached, remove oldest entry', function (t) {
  var cache = new Store({maxEntries: 2});
  cache.set('key1', 'val1');
  cache.set('key2', 'val2');
  cache.set('key3', 'val3');
  val = cache.get('key1');
  t.equal(val, undefined, 'Oldest entry removed');
  val = cache.get('key2');
  t.equal(val, 'val2', 'Second entry intact');
  val = cache.get('key3');
  t.equal(val, 'val3', 'Third entry intact');
  t.end();
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

test('exit', function (t) {
  process.exit(0);
});

function skiptest() {};
