'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.START_TIME = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _express = require('express');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var START_TIME = exports.START_TIME = new Date();

var Approuter = function () {
    function Approuter(app) {
        _classCallCheck(this, Approuter);

        this.app = app;

        this.setupRouter = this.setupRouter.bind(this);
        this.setupRouter();
    }

    _createClass(Approuter, [{
        key: 'setupRouter',
        value: function setupRouter() {

            var app = this.app;

            console.log("App router works");

            /**
             * @endpoint /
             * method should be GET @method: GET
             **/

            app.get('/', function (req, res, next) {
                return res.json({
                    started: (0, _moment2.default)(START_TIME).fromNow()
                });
            });

            /**
             * @endpoint /api/users
             *  @method: POST
             **/

            app.post('/api/users', function (req, res, next) {

                var body = req.body;

                app.models.user.create(body).then(function (user) {
                    _lodash2.default.unset(user, 'password');
                    return res.status(200).json(user);
                }).catch(function (err) {

                    return res.status(503).json({ error: err });
                });
            });

            /**
             * @endpoint /api/users/me
             * method should be GET @method: GET
             **/

            app.get('/api/users/me', function (req, res, next) {

                var tokenId = req.get('authorization');

                if (!tokenId) {
                    //get token from query

                    tokenId = _lodash2.default.get(req, 'query.auth');
                }
                app.models.token.loadTokenAndUser(tokenId).then(function (token) {

                    return res.json(token);
                }).catch(function (err) {

                    return res.status(401).json({
                        error: err
                    });
                });
            });

            /**
            * @endpoint /api/users/search
            *  @method: POST
            **/
            app.post('/api/users/search', function (req, res, next) {
                var keyword = _lodash2.default.get(req, 'body.search', '');
                app.models.user.search(keyword).then(function (results) {

                    return res.status(200).json(results);
                }).catch(function (err) {
                    return res.status(404).json({
                        error: 'Not Found'
                    });
                });
            });

            /**
            * @endpoint /api/users:id
            *  @method: GET
            **/

            app.get('/api/users/:id', function (req, res, next) {
                var userId = _lodash2.default.get(req, 'params.id');

                app.models.user.load(userId).then(function (user) {
                    _lodash2.default.unset(user, 'password');
                    return res.status(200).json(user);
                }).catch(function (err) {
                    return res.status(404).json({
                        error: err
                    });
                });
            });

            /**
            * @endpoint /api/users/login
            *  @method: POST
            **/

            app.post('/api/users/login', function (req, res, next) {
                var body = _lodash2.default.get(req, 'body');
                app.models.user.login(body).then(function (token) {
                    _lodash2.default.unset(token, 'user.password');
                    return res.status(200).json(token);
                }).catch(function (err) {
                    return res.status(401).json({
                        error: err
                    });
                });
            });

            /**
            * @endpoint /api/channels/:id
            *  @method: GET
            **/

            app.get('/api/channels/:id', function (req, res, next) {

                var channelId = _lodash2.default.get(req, 'params.id');
                if (!channelId) {
                    return res.status(404).json({ error: { message: "Not Found." } });
                }
                app.models.channel.load(channelId).then(function (channel) {

                    //fetch all users belonging to the member id
                    var members = channel.members;
                    var query = {
                        _id: { $in: members }
                    };
                    var options = { _id: 1, name: 1, created: 1, password: 0 };
                    app.models.user.find(query, options).then(function (users) {
                        channel.users = users;
                        return res.status(200).json(channel);
                    }).catch(function (err) {
                        return res.status(404).json({ error: { message: "Not Found." } });
                    });
                }).catch(function (err) {
                    return res.status(404).json({ error: { message: "Not Found." } });
                });
            });

            /**
             * @endpoint /api/me/channels
             * @method: GET
             **/

            app.get('/api/me/channels', function (req, res, next) {

                var tokenId = req.get('authorization');

                if (!tokenId) {
                    //get token from query

                    tokenId = _lodash2.default.get(req, 'query.auth');
                }
                console.log("daddaADDAD", tokenId);
                app.models.token.loadTokenAndUser(tokenId).then(function (token) {
                    var userId = token.userId;
                    // const query = {
                    //     members: {$all: [userId]}
                    // };

                    var query = [];
                    // const query = [
                    //     {
                    //         $lookup: {
                    //             from: 'users',
                    //             localField: 'members' ,
                    //             foreignField: '_id',
                    //             as: 'users',
                    //         }
                    //     }
                    // ];
                    console.log("adsad", query);
                    app.models.channel.aggregate(query).then(function (channels) {
                        return res.status(200).json(channels);
                    }).catch(function (err) {
                        return res.status(404).json({ error: { message: "Not found." } });
                    });
                }).catch(function (err) {
                    return res.status(401).json({
                        error: "Access denied."
                    });
                });

                // return res.json({it: "works"});
            });
        }
    }]);

    return Approuter;
}();

exports.default = Approuter;
//# sourceMappingURL=app-router.js.map