var test = require('tap').test;
var mongo = require('mongodb').MongoClient;
var QueryCache = require('../');

var DB   = process.env.QC_TEST_DB || 'test';
var URI  = process.env.QC_URI || 'mongodb://127.0.0.1:27017';

var db;

test('Cache enabled', function (enabled) {
  enabled.plan(1);
  QueryCache._eventbus.once('enable', function () {
    enabled.ok(true, 'event fired');
  });
});

test('Connect to test database', function (conTest) {
  mongo.connect(URI, function (err, _db) {
    conTest.plan(1);
    conTest.error(err, 'connected');

    db = _db.db(DB);
  });
});

test('Basic cache read/write operations', function (t) {
  t.plan(4);
  var qcache = new QueryCache({
    dbName: DB,
    collections: ['test1', 'test2']
  });
  qcache.set('some key', 'some val', function (err, a) {
    t.error(err, 'set finished with no error');
    qcache.get('some key', function (err, b) {
      t.error(err, 'get finished with no error');
      t.equal(a, 'some val', 'set returns the value');
      t.equal(b, 'some val', 'get returns the value');
    });
  });
});

test('Basic automatic cache invalidations', function (t) {
  t.plan(4);
  var qcache = new QueryCache({
    dbName: DB,
    collections: ['test1', 'test2']
  });
  QueryCache._eventbus.once(DB + '.test1', function () {
    qcache.get('some key', function (err, val) {
      if (err) throw err;
      t.equal(val, null, 'cache is invalidated');
      qcache.set('some key', 'some val', function (err) {
        t.error(err, 'set finished with no error');
        insert('test2');
      });
    });
  });

  QueryCache._eventbus.once(DB + '.test2', function () {
    qcache.get('some key', function (err, val) {
      if (err) throw err;
      t.equal(val, null, 'cache is invalidated');
    });
  });

  qcache.set('some key', 'some val', function (err) {
    if (err) throw err;
    insert('test1');
  });

  function insert(colName) {
    var col = db.collection(colName);
    col.insert({test: colName}, function (err) {
      t.error(err, 'test doc inserted');
    });
  }
});

test('Disabled QueryCache', function (disabled) {
  disabled.plan(3);
  var qcache = new QueryCache({dbName: DB, collections: ['test']});
  qcache.disable();
  qcache.set('some key', 'some val', function (err) {
    disabled.error(err, 'set finished with no error');
    qcache.get('some key', function (err, value) {
      disabled.error(err, 'get finished with no error');
      disabled.equal(value, undefined, 'got no value');
    });
  });
});

test('exit', function () {
  process.exit(0);
});
