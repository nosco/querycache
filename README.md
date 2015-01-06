# querycache

This module provides an easy to use caching layer for any nodejs application
that needs to optimize speed for mongodb read queries. The cache defaults to a
in-memory data store, but also has support for redis, which makes it easy for
multiple frontends to utilize the same cache. The cache automatically gets
invalidated on any oplog events that reference the specified database and
collections. For this reason, the mongodb instance must be configured as a
replicaset. For testing purposes, this can be done by configuring mongo as a
singleton replicaset:

```bash
mongod --replSet name
mongo --eval 'rs.initiate()'
```

## Install

```bash
npm install querycache
```

## Configuration

Configurations are managed by the following environmental variables

```bash
QC_ENABLE                     # To enable the cache set this to 'true'. Default
                              # behaviour is not to enable the cache.

QC_URI                        # The mongodb 'local' database connection string,
                              # defaults to "mongodb://127.0.0.1:27017/local".

QC_MAX_ENTRIES                # The maximum allowed number of entries to hold
                              # in cache, defaults to 100000. This setting can
                              # be overwritten by the ``maxEntries``
                              # constructor option.

QC_REDIS_PORT                 # The port to connect to redis on, defaults to
                              # 6379.
QC_REDIS_HOST                 # The redis host, defaults to '127.0.0.1'
```

If ``QC_MAX_ENTRIES`` is reached, the oldest entry is removed when a new query
is cached.

## Usage examples

In these examples the cache will be invalidated on any updates to either of the
collections: 'test1' or 'test2' in the 'test' database.

```javascript
var QueryCache = require('querycache');
var querycache = new QueryCache({
  dbName: 'test',
  collections: ['test1', 'test2']
});

querycache.set('some key', 'some value', function (err) {
  if (err) throw err;
  querycache.get('some key', function (err, value) {
    if (err) throw err;
    console.log(value);
  });
});
```

```javascript
var mongo = require('mongodb').MongoClient;
var QueryCache = require('querycache');
var querycache = new QueryCache({
  dbName: 'test',
  collections: ['test1', 'test2']
});

var someQuery = { values: { $in: [ 'foo', 'bar' ] } };
mongo.connect('mongodb://127.0.0.1:27017/test', function (err, db) {
  if (err) throw err;
  querycache.get(someQuery, function (err, result) {
    if (err || !result) {
      var test1 = db.collection('test1');
      test1.findOne(someQuery, function (err, result) {
        if (err) throw err;
        querycache.set(someQuery, result, function (err) {
          if (err) console.error(err);
          console.log(result);
        });
      });
    } else {
      console.log(result);
    }
  });
});
```
### Using redis as data store

```javascript
var QueryCache = require('querycache');
var querycache = new QueryCache({
  dbName: 'test',
  collections: ['test1'],
  datastore: 'redis'
});

querycache.set('some key', 'some value', function (err) {
  if (err) throw err;
  querycache.get('some key', function (err, value) {
    if (err) throw err;
    console.log(value);
  });
});
```
