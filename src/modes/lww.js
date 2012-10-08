// TODO Add in redis adapter for version clock
var transaction = require('../transaction.server')
  , createStartIdVerifier = require('./shared').createStartIdVerifier

module.exports = function (opts) {
  var store = opts.store;
  return new Lww(store);
};

function Lww (store) {
  this._store = store;
  this._nextVer = 1;
  // TODO Remove this startId requirement for lww
  this.startIdVerifier = createStartIdVerifier(this.startId.bind(this));

  var self = this;
  this.incrVer = function (req, res, next) {
    var txn = req.data;
    var ver = req.newVer = self._nextVer++;
    transaction.setVer(txn, ver);
    return next();
  };
}

Lww.prototype = {
  // TODO Remove this startId requirement for lww
  startId: function (callback) {
    var startId = this._startId || (this._startId = (+new Date).toString(36));
    callback(null, startId);
  }

, flush: function (callback) { callback(null); }

, version: function (callback) {
    callback(null, this._nextVer - 1);
  }

, snapshotSince: function (params, callback) {
    var ver = params.ver
      , clientId = params.clientId
      , subs = params.subs;

    var req = {
      targets: subs
    , clientId: clientId
    , session: params.session
    , context: params.context
    };
    var res = {
      fail: callback
    , send: function (data) {
        callback(null, {data: data});
      }
    };
    this._store.middleware.fetch(req, res);
  }
};
