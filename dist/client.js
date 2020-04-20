'use strict';

var WebSocket = require('ws');

var ws = new WebSocket('ws://localhost:3000/');

ws.on('open', function () {

    console.log('Successfully connected to the server');

    // send new message from client to server

    ws.send('Hello Server my name is client');

    // listen to server
    ws.on('message', function (message) {
        console.log('Got back message from server', message);
        ws.send(message);
    });
});
//# sourceMappingURL=client.js.map