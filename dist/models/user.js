'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _helper = require('../helper');

var _bcrypt = require('bcrypt');

var _bcrypt2 = _interopRequireDefault(_bcrypt);

var _mongodb = require('mongodb');

var _immutable = require('immutable');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var saltRound = 10;

var User = function () {
    function User(app) {
        _classCallCheck(this, User);

        this.app = app;

        this.users = new _immutable.OrderedMap();
    }

    _createClass(User, [{
        key: 'find',
        value: function find() {
            var _this = this;

            var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


            return new Promise(function (resolve, reject) {
                var db = _this.app.db;
                db.db("mongodbmessenger").collection('users').find(query, options).toArray(function (err, users) {
                    return err ? reject(err) : resolve(users);
                });
            });
        }
    }, {
        key: 'search',
        value: function search() {
            var _this2 = this;

            var q = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";


            return new Promise(function (resolve, reject) {

                var regex = new RegExp(q, 'i');

                var query = {
                    $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }]
                };
                var db = _this2.app.db;
                db.db("mongodbmessenger").collection('users').find(query, { _id: true, name: true, created: true }).toArray(function (err, results) {
                    if (err || !results || !results.length) {
                        return reject({ message: "Not Found" });
                    }
                    return resolve(results);
                });
            });
        }
    }, {
        key: 'login',
        value: function login(user) {
            var _this3 = this;

            var email = _lodash2.default.get(user, 'email', '');
            var password = _lodash2.default.get(user, 'password', '');
            return new Promise(function (resolve, reject) {
                if (!password || !email || !(0, _helper.isEmail)(email)) {
                    return reject({ message: "Error in login" });
                }

                //find in database

                _this3.findUserByEmail(email, function (err, result) {
                    if (err) {
                        return reject({ message: "Login Error" });
                    }
                    // if found user compare the password hash and plain text
                    var hashPassword = _lodash2.default.get(result, 'password');
                    var isMatch = _bcrypt2.default.compareSync(password, hashPassword);
                    if (!isMatch) {
                        return reject({ message: "Login error" });
                    }
                    // Login successful create new token and save to token collection
                    var userId = result._id;
                    _this3.app.models.token.create(userId).then(function (token) {
                        token.user = result;
                        return resolve(token);
                    }).catch(function (err) {
                        return reject({ message: "Login Error" });
                    });
                });
            });
        }
    }, {
        key: 'findUserByEmail',
        value: function findUserByEmail(email) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            var db = this.app.db;
            db.db("mongodbmessenger").collection('users').findOne({ email: email }, function (err, result) {
                if (err || !result) {
                    return callback({ message: "User not found" });
                }

                return callback(null, result);
            });
        }
    }, {
        key: 'load',
        value: function load(id) {
            var _this4 = this;

            id = '' + id;
            // eslint-disable-next-line no-undef
            return new Promise(function (resolve, reject) {
                // find in cache if found we return and dont need to query db
                var userInCache = _this4.users.get(id);
                if (userInCache) {
                    return resolve(userInCache);
                }
                // if not found then start query db
                _this4.findUserById(id, function (err, user) {
                    if (!err && user) {
                        _this4.users = _this4.users.set(id, user);
                    }
                    return err ? reject(err) : resolve(user);
                });
            });
        }
    }, {
        key: 'findUserById',
        value: function findUserById(id) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            console.log("Query in Database");
            var db = this.app.db;
            if (!id) {
                return callback({ message: "User not found" }, null);
            }
            var userId = new _mongodb.ObjectID(id);
            db.db("mongodbmessenger").collection('users').findOne({ _id: userId }, function (err, result) {
                if (err || !result) {
                    return callback({ message: "User not found" });
                }
                return callback(null, result);
            });
        }
    }, {
        key: 'beforeSave',
        value: function beforeSave(user) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};


            //first validate the user object before save to user collection
            var errors = [];
            var fields = ['name', 'email', 'password'];
            var validations = {
                name: {
                    errorMessage: 'Name is required',
                    do: function _do() {

                        var name = _lodash2.default.get(user, 'name', '');

                        return name.length;
                    }
                },
                email: {
                    errorMessage: 'Email is not correct',
                    do: function _do() {
                        var email = _lodash2.default.get(user, 'email', '');
                        if (!email.length || !(0, _helper.isEmail)(email)) {
                            return false;
                        }
                        return true;
                    }
                },
                password: {
                    errorMessage: 'Password is required and more than 3 characters',
                    do: function _do() {
                        var password = _lodash2.default.get(user, 'password', '');
                        if (!password.length || password.length < 3) {
                            return false;
                        }
                        return true;
                    }
                }
            };

            fields.forEach(function (field) {

                var fieldValidation = _lodash2.default.get(validations, field);

                if (fieldValidation) {
                    // do check
                    var isValid = fieldValidation.do();
                    var msg = fieldValidation.errorMessage;
                    if (!isValid) {
                        errors.push(msg);
                    }
                }
            });

            if (errors.length) {

                //validation test not passed 

                var err = _lodash2.default.join(errors, ',');
                return callback(err, null);
            }

            var db = this.app.db;
            //check if email already exists in db
            var email = _lodash2.default.toLower(_lodash2.default.trim(_lodash2.default.get(user, 'email', '')));
            db.db("mongodbmessenger").collection('users').findOne({ email: email }, function (err, result) {
                console.log("Checking Email with result:", err, result);
                if (err || result) {
                    return callback({ message: "Email already Exist" }, null);
                }

                // return callback with success checked
                var password = _lodash2.default.get(user, 'password');
                var hashPassword = _bcrypt2.default.hashSync(password, saltRound);

                var userFormatted = {
                    name: '' + _lodash2.default.trim(_lodash2.default.get(user, 'name')),
                    email: email,
                    password: hashPassword,
                    created: new Date()
                };

                return callback(null, userFormatted);
            });
        }
    }, {
        key: 'create',
        value: function create(user) {
            var _this5 = this;

            var db = this.app.db;
            console.log("User", user);
            return new Promise(function (resolve, reject) {

                _this5.beforeSave(user, function (err, user) {

                    console.log("After validation: ", err, user);
                    console.log("Error ta nul hi hai", err);
                    if (err) {
                        return reject(err);
                    }

                    // insert new user object to user collection

                    //console.log("just to check db is correct here",db);
                    db.db("mongodbmessenger").collection('users').insertOne(user, function (err, info) {

                        console.log("coming in here.....");
                        // check if error return error to user 
                        if (err) {

                            return reject({ message: "An error saving user" });
                        }
                        //otherwise return user object to user
                        var userId = _lodash2.default.get(user, '_id').toString();
                        _this5.users = _this5.users.set(userId, user);

                        return resolve(user);
                    });
                });
            });
        }
    }]);

    return User;
}();

exports.default = User;
//# sourceMappingURL=user.js.map