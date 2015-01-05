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
          qcache.set('some key', 'some val', function (err, a) {
            t.error(err);
            qcache.get('some key', function (err, b) {
              t.error(err);
              t.equal(a, 'some val', '#set returns the value');
              t.equal(b, 'some val', '#get returns the value');
              t.end();
            });
          });
        });
        test('Basic automatic cache invalidations', function (t) {
          t.plan(2);
          var qcache = new QueryCache({
            dbName: DB,
            collections: ['test1', 'test2']
          });
          qcache.set('some key', 'some val', function (err) {
            if (err) throw err;
          });

          QueryCache._eventbus.once(DB + '.test1', function () {
            qcache.get('some key', function (err, val) {
              if (err) throw err;
              t.equal(val, undefined, 'cache is invalidated');
              qcache.set('some key', 'some val', function (err) {
                t.error(err);
                insert('test2');
              });
            });
          });

          QueryCache._eventbus.once(DB + '.test2', function () {
            qcache.get('some key', function (err, val) {
              if (err) throw err;
              t.equal(val, undefined, 'cache is invalidated');
            });
          });

          insert('test1');
          function insert(colName) {
            var col = db.collection(colName);
            col.insert({test: colName}, function (err) {
              if (err) throw err;
            });
          }
        });
        test('exit', function (t) {
          process.exit(0);
        });
      });
    });
  });
});

function skiptest() {};
