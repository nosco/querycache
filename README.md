# querycache

This module provides an easy to use caching layer for any nodejs application
that needs to optimize speed for mongodb read queries. The cache is an
in-memory key value store that automatically gets invalidated on specified
oplog events. For this reason, the mongodb instance must be configured as a
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
QUERYCACHE_ENABLE             # To enable the cache set this to 'true'. Default
                              # behaviour is not to enable the cache.

QUERYCACHE_URI                # The mongodb 'local' database connection string,
                              # defaults to "mongodb://127.0.0.1:27017/local".

QUERYCACHE_MAX_ENTRIES        # The maximum allowed number of entries to hold
                              # in cache, defaults to 100000.
```

If ``QUERYCACHE_MAX_ENTRIES`` is reached, the oldest entry is removed when a
new query is cached.

## Usage examples

In these examples the cache will be invalidated on any updates to either of the
collections: 'test1' or 'test2' in the 'test' database.

```javascript
var QueryCache = require('querycache');
var querycache = new QueryCache({
  dbname: 'test',
  collections: ['test1', 'test2']
});

querycache.set('some key', 'some value');
console.log(querycache.get('some key'));
```

```javascript
var mongo = require('mongodb').MongoClient;
var QueryCache = require('querycache');
var querycache = new QueryCache({
  dbname: 'test',
  collections: ['test1', 'test2']
});

var someQuery = { values: { $in: [ 'foo', 'bar' ] } };
mongo.connect('mongodb://127.0.0.1:27017/test', function (err, db) {
  if (err) throw err;
  var result = querycache.get(someQuery);
  if (result) {
    console.log(result);
  } else {
    var test1 = db.collection('test1');
    test1.findOne(someQuery, function (err, result) {
      if (err) throw err;
      querycache.set(someQuery, result);
      console.log(result);
    });
  }
});
```
}
