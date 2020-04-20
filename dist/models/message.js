'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _immutable = require('immutable');

var _mongodb = require('mongodb');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Message = function () {
    function Message(app) {
        _classCallCheck(this, Message);

        this.app = app;
        this.messages = new _immutable.OrderedMap();
    }

    _createClass(Message, [{
        key: 'create',
        value: function create(obj) {
            var _this = this;

            return new Promise(function (resolve, reject) {

                var idd = _lodash2.default.get(obj, '_id');
                var id = _lodash2.default.toString(idd);

                var userId = new _mongodb.ObjectId(_lodash2.default.get(obj, 'userId'));
                var channelId = new _mongodb.ObjectId(_lodash2.default.get(obj, 'channelId'));

                var message = {
                    _id: new _mongodb.ObjectId(id),
                    body: _lodash2.default.get(obj, 'body', ''),
                    userId: userId,
                    channelId: channelId,
                    created: new Date()
                };
                console.log("iddddd--msg:", message);

                _this.app.db.db("mongodbmessenger").collection('messages').insertOne(message, function (err, info) {

                    if (err) {
                        return reject(err);
                    }

                    _this.app.models.user.load(_lodash2.default.toString(userId)).then(function (user) {
                        _lodash2.default.unset(user, 'password');
                        _lodash2.default.unset(user, 'email');

                        message.user = user;

                        return resolve(message);
                    }).catch(function (err) {
                        return reject(err);
                    });

                    // console.log("I am hereeeeeeeeeeeeeeeeeee");
                    // return err ? reject(err) : resolve(message);
                });
            });
        }
    }]);

    return Message;
}();

exports.default = Message;
//# sourceMappingURL=message.js.map