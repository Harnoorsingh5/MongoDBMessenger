"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _moment = require("moment");

var _moment2 = _interopRequireDefault(_moment);

var _mongodb = require("mongodb");

var _immutable = require("immutable");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Token = function () {
    function Token(app) {
        _classCallCheck(this, Token);

        this.app = app;
        this.tokens = new _immutable.OrderedMap();
    }

    _createClass(Token, [{
        key: "loadTokenAndUser",
        value: function loadTokenAndUser(id) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                _this.load(id).then(function (token) {

                    var userId = "" + token.userId;
                    _this.app.models.user.load(userId).then(function (user) {
                        token.user = user;
                        return resolve(token);
                    }).catch(function (err) {
                        console.log("error is here");
                        return reject({ err: err });
                    });
                }).catch(function (err) {
                    console.log("error is here 2222");
                    return reject({ err: err });
                });
            });
        }
    }, {
        key: "load",
        value: function load() {
            var _this2 = this;

            var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;


            id = "" + id;

            return new Promise(function (resolve, reject) {
                //checking in cache first

                var tokenFromCache = _this2.tokens.get(id);
                if (tokenFromCache) {
                    return resolve(tokenFromCache);
                }
                _this2.findTokenById(id, function (err, token) {
                    if (!err && token) {
                        var tokenId = token._id.toString();
                        _this2.tokens = _this2.tokens.set(tokenId, token);
                    }
                    return err ? reject(err) : resolve(token);
                });
            });
        }
    }, {
        key: "findTokenById",
        value: function findTokenById(id) {
            var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};


            console.log("Begin query into database");

            var idObject = new _mongodb.ObjectID(id);
            var query = { _id: idObject };

            var db = this.app.db;
            db.db("mongodbmessenger").collection('tokens').findOne(query, function (err, result) {
                if (err || !result) {
                    return cb({ "message": "Not Found" }, null);
                }
                return cb(null, result);
            });
        }
    }, {
        key: "create",
        value: function create(userId) {
            var token = {
                userId: userId,
                created: new Date()
            };
            var db = this.app.db;
            return new Promise(function (resolve, reject) {
                db.db("mongodbmessenger").collection('tokens').insertOne(token, function (err, info) {
                    return err ? reject(err) : resolve(token);
                });
            });
        }
    }]);

    return Token;
}();

exports.default = Token;
//# sourceMappingURL=token.js.map