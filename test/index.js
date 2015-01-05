var test = require('tap').test;
var mongo = require('mongodb').MongoClient;
var QueryCache = require('../');

var DB   = process.env.QC_TEST_DB || 'test';
var URI  = process.env.QC_URI || 'mongodb://127.0.0.1:27017';

test('Cache enabled', function (enabled) {
  QueryCache._eventbus.once('enable', function () {
    enabled.end();
    test('Connect to test database', function (conTest) {
      mongo.connect(URI, function (err, db) {
        conTest.error(err);
        conTest.end();

        db = db.db(DB);
        test('Basic cache read/write operations', function (t) {
          var qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2']
          });
          var a = qcache.set('some key', 'some val');
          var b = qcache.get('some key');
          t.equal(a, 'some val', '#set returns the value');
          t.equal(b, 'some val', '#get returns the value');
          t.end();
        });
        test('Basic cache invalidations', function (t) {
          t.plan(2);
          var qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2']
          });
          qcache.set('some key', 'some val');

          QueryCache._eventbus.once(DB + '.test1', function () {
            t.deepEqual(qcache._cache, {}, 'cache is empty');
            qcache.set('some key', 'some val');
            insert('test2');
          });

          QueryCache._eventbus.once(DB + '.test2', function () {
            t.deepEqual(qcache._cache, {}, 'cache is empty');
          });


          insert('test1');
          function insert(colName) {
            var col = db.collection(colName);
            col.insert({test: colName}, function (err) {
              if (err) throw err;
            });
          }
        });
        test('Honour the MAX_ENTRIES bound', function (t) {
          var maxEntries = 2;
          var qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2'],
            maxEntries: maxEntries
          });
          var entries;
          for (var i=1;i<5;i++) {
            qcache.set(i, i);
            entries = Object.keys(qcache._cache).length;
            if (i>maxEntries) {
              t.equal(entries, maxEntries,
                      'Correct number of entries: ' + maxEntries);
            } else {
              t.equal(entries, i, 'Correct number of entries: ' + i);
            }
          }
          t.end();
        });
        test('When MAX_ENTRIES is reached, remove oldest entry', function (t) {
          var qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2'],
            maxEntries: 2,
          });
          qcache.set('key1', 'val1');
          qcache.set('key2', 'val2');
          qcache.set('key3', 'val3');
          val = qcache.get('key1');
          t.equal(val, undefined, 'Oldest entry removed');
          val = qcache.get('key2');
          t.equal(val, 'val2', 'Second entry intact');
          val = qcache.get('key3');
          t.equal(val, 'val3', 'Third entry intact');
          t.end();
        });
        test('QueryCache#maxEntries is set correctly', function (t) {
          var qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2']
          });
          t.equal(qcache.maxEntries, 100000, 'Default is 100000');

          process.env.QC_MAX_ENTRIES = '10';
          delete require.cache[require.resolve('../')];
          QueryCache = require('../');
          qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2']
          });
          t.equal(qcache.maxEntries, 10, 'Can be set by environmental var');

          qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2'],
            maxEntries: 20
          });
          t.equal(qcache.maxEntries, 20, 'Can be overwritten by constructor');
          t.end();
        });

        test('exit', function (t) {
          process.exit(0);
        });
      });
    });
  });
});

function skiptest() {};
