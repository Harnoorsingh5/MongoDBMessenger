"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var isEmail = exports.isEmail = function isEmail(email) {

    var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return regex.test(email);
};

var toString = exports.toString = function toString(id) {
    return "" + id;
};
//# sourceMappingURL=helper.js.map