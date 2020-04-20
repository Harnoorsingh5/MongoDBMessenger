import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import {version} from '../package.json';
import { createConnection } from 'net';
import Approuter from './app-router.js';
import Model from './models'
import Database from './database.js';
import { Db } from 'mongodb';

const PORT = 3001;
const app = express();
app.server = http.createServer(app);


//app.use(morgan('dev'));


app.use(cors({
    exposedHeaders: "*"
}));

app.use(bodyParser.json({
    limit: '50mb'
}));

const WebSocket = require('ws');

app.ws = new WebSocket.Server({
    server: app.server
});

//connect to mongo Database

new Database().connect().then((db) => {
    console.log("Succesfully connected to database");
    app.db = db;

}).catch((err) => {
    throw(err);
});

//End connect to mongo db

app.models = new Model(app);
app.routers = new Approuter(app);





app.server.listen(process.env.PORT || PORT, () => {
        console.log(`App is running on port ${app.server.address().port}`);
});

export default app;