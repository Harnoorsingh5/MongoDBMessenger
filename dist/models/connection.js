"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _immutable = require("immutable");

var _mongodb = require("mongodb");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Connection = function () {
    function Connection(app) {
        _classCallCheck(this, Connection);

        this.app = app;
        this.connections = (0, _immutable.OrderedMap)();

        this.modelDidLoad();
    }

    _createClass(Connection, [{
        key: "decodeMessage",
        value: function decodeMessage(msg) {
            var messageObject = null;
            try {
                messageObject = JSON.parse(msg);
            } catch (err) {
                console.log("Ann error", msg);
            }
            return messageObject;
        }
    }, {
        key: "send",
        value: function send(ws, obj) {
            var message = JSON.stringify(obj);
            ws.send(message);
        }
    }, {
        key: "doTheJob",
        value: function doTheJob(socketId, msg) {
            var _this = this;

            var action = _lodash2.default.get(msg, 'action');
            var payload = _lodash2.default.get(msg, 'payload');
            var connection = this.connections.get(socketId);

            switch (action) {

                case 'create_message':

                    if (connection.isAuthenticated) {

                        var messageObject = payload;
                        messageObject.userId = _lodash2.default.get(connection, 'userId');
                        console.log("Got message from client about creating new message", messageObject);

                        this.app.models.message.create(messageObject).then(function (message) {

                            console.log("Message final bhai:", message);

                            var channelId = _lodash2.default.toString(_lodash2.default.get(message, 'channelId'));
                            _this.app.models.channel.load(channelId).then(function (channel) {
                                console.log("Channel of the message vla channel is", channel);

                                var memberIds = _lodash2.default.get(channel, 'members', []);

                                _lodash2.default.each(memberIds, function (memberId) {

                                    memberId = _lodash2.default.toString(memberId);
                                    var memberConnections = _this.connections.filter(function (c) {
                                        return _lodash2.default.toString(c.userId) === memberId;
                                    });
                                    memberConnections.forEach(function (connection) {
                                        var ws = connection.ws;
                                        _this.send(ws, {

                                            action: 'message_added',
                                            payload: message
                                        });
                                    });
                                });
                            });
                        }).catch(function (err) {

                            //send back to the socket client who sent this message with error
                            var ws = connection.ws;
                            _this.send(ws, {
                                action: 'create_message_error',
                                payload: payload
                            });
                        });
                    }

                    break;

                case 'create_channel':
                    {
                        var channel = payload;

                        var userId = connection.userId;
                        channel.userId = userId;
                        this.app.models.channel.create(channel).then(function (channelObject) {
                            // Sucessfuly created channel
                            console.log("Created mew cchannel");
                            var memberConnections = [];
                            var memberIds = _lodash2.default.get(channelObject, 'members', []);
                            var query = {
                                _id: { $in: memberIds }
                            };
                            var queryOptions = {
                                _id: 1,
                                name: 1,
                                created: 1
                            };
                            _this.app.models.user.find(query, queryOptions).then(function (users) {
                                channelObject.users = users;

                                _lodash2.default.each(memberIds, function (id) {
                                    var userId = id.toString();
                                    var memberConnection = _this.connections.filter(function (con) {
                                        return "" + con.userId === userId;
                                    });
                                    if (memberConnection.size) {
                                        memberConnection.forEach(function (con) {
                                            var ws = con.ws;
                                            var obj = {
                                                action: 'channel_added',
                                                payload: channelObject

                                                //send to socket matching user id in channel member
                                            };_this.send(ws, obj);
                                        });
                                    }
                                });
                            });
                        });
                        console.log('Got new channel to be created', typeof userId === "undefined" ? "undefined" : _typeof(userId), channel);
                    }

                    break;
                case 'auth':
                    {
                        console.log("Authentication");
                        var userTokenId = payload;
                        var _connection = this.connections.get(socketId);
                        if (_connection) {
                            //find user with token and verify
                            this.app.models.token.loadTokenAndUser(userTokenId).then(function (token) {
                                var userId = token.userId;
                                _connection.isAuthenticated = true;
                                _connection.userId = "" + userId;
                                _this.connections = _this.connections.set(socketId, _connection);
                                var obj = {
                                    action: 'auth-success',
                                    payload: 'You are aunthenticated'
                                };
                                _this.send(_connection.ws, obj);
                            }).catch(function (err) {
                                // Send login error
                                var obj = {
                                    action: 'auth_error',
                                    payload: "Authentication error:" + userTokenId
                                };
                                _this.send(_connection.ws, obj);
                            });
                        }

                        console.log('USer with token id', userTokenId, typeof userTokenId === "undefined" ? "undefined" : _typeof(userTokenId));
                    }
                    break;
                default:
                    break;
            }
        }
    }, {
        key: "modelDidLoad",
        value: function modelDidLoad() {
            var _this2 = this;

            this.app.ws.on('connection', function (ws) {
                var socketId = new _mongodb.ObjectID().toString();
                var clientConnection = {
                    _id: "" + socketId,
                    ws: ws,
                    userId: null,
                    isAuthenticated: false

                    // save this connection in Cache
                };_this2.connections = _this2.connections.set(socketId, clientConnection);

                // listen any message from websocket client
                ws.on('message', function (msg) {
                    console.log("Within message");
                    var message = _this2.decodeMessage(msg);
                    _this2.doTheJob(socketId, message);
                });
                ws.on('close', function () {
                    // remove socket from cache
                    _this2.connections = _this2.connections.remove(socketId);
                });
            });
        }
    }]);

    return Connection;
}();

exports.default = Connection;
//# sourceMappingURL=connection.js.map