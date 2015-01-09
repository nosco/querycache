var test = require('tap').test;

var QueryCache = require('../');

var DB   = process.env.QC_TEST_DB || 'test';
var URI  = process.env.QC_URI || 'mongodb://127.0.0.1:27017';

var TEST_KEY = 'some key';

test('Cache enabled', function (enabled) {
  enabled.plan(1);
  QueryCache._eventbus.once('enable', function () {
    enabled.ok(true, 'event fired');
  });
});

test('Defaults to unhashed keys', function (t) {
  t.plan(1);
  var qcache = new QueryCache({
    dbName: 'test',
    collections: ['test1']
  });
  qcache.set(TEST_KEY, 42, function (err) {
    if (err) throw err;
    var key = Object.keys(qcache.cache._cache).pop();
    t.equal(key, JSON.stringify(TEST_KEY), 'key is unhashed');
  });
});

test('Hashes keys with sha1 (base64)', function (t) {
  var expectedHash = 'wumyJkLDydsFrDd4KE6yKY7T70w='; // '"some key"'
  t.plan(1);
  var qcache = new QueryCache({
    dbName: 'test',
    collections: ['test1'],
    hashedKeys: true
  });
  qcache.set(TEST_KEY, 42, function (err) {
    if (err) throw err;
    var key = Object.keys(qcache.cache._cache).pop();
    t.equal(key, expectedHash, 'key is hashed');
  });
});

test('exit', function () {
  process.exit(0);
});
