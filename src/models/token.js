import _ from 'lodash';
import { ObjectID } from "mongodb";
import {OrderedMap} from "immutable";

export default class Token {
    constructor(app) {
        this.app = app;
        this.tokens = new OrderedMap();
    }

    logout(token){
		return new Promise((resolve, reject) => {
            const tokenId = _.toString(token._id);
            // to remove token from cache
            this.tokens = this.tokens.remove(tokenId);
            // we have to delete this token id from tokens collection
            this.app.db.db("mongodbmessenger").collection('tokens').remove({_id: new ObjectID(tokenId)}, (err, info) => {
					return err ? reject(err) : resolve(info);
            });
		})
	}

    loadTokenAndUser(id) {
        return new Promise((resolve,reject) => {
            this.load(id).then((token) => {

                const userId = `${token.userId}`;
                this.app.models.user.load(userId).then((user) => {
                    token.user = user;
                    return resolve(token);
                }).catch((err) => {
                    console.log("error is here");
                    return reject({err}); 
                });

            }).catch((err) => {
                console.log("error is here 2222");
                return reject({err});
            })
        })
    }

    load(id=null) {

        id=`${id}`;

        return new Promise((resolve,reject) => {
            //checking in cache first

            const tokenFromCache = this.tokens.get(id);
            if(tokenFromCache) {
                return resolve(tokenFromCache);
            }
            this.findTokenById(id,(err,token) => {
                if(!err && token) {
                    const tokenId = token._id.toString(); 
                    this.tokens = this.tokens.set(tokenId,token);
                }
                return err? reject(err):resolve(token);

            });
           
        })
    }

    findTokenById(id,cb = () => {}) {

        console.log("Begin query into database");

        
        const idObject = new ObjectID(id);
        const query = {_id: idObject}

        const db = this.app.db;
        db.db("mongodbmessenger").collection('tokens').findOne(query, (err,result) => {
            if(err || !result) {
                return cb({"message":"Not Found"},null);
            }
            return cb(null,result);
        })

    }

    create(userId) {
        const token = {
            userId: userId,
            created: new Date()
        }
        const db = this.app.db;
        return new Promise((resolve, reject) => {
            db.db("mongodbmessenger").collection('tokens').insertOne(token, (err, info) => {
                return err ? reject(err) : resolve(token);
            })
        });

    }
}