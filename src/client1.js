

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/');

ws.on('open', () => {

    console.log('Successfully connected to the server');

    // send new message from client to server



    // listen to server
    ws.on('message', (message) => {
        console.log(message);
    });
});
