import _ from 'lodash'
import {OrderedMap} from 'immutable' 
import {ObjectId} from 'mongodb'
export default class Message{

    constructor(app){
        this.app = app;
        this.messages = new OrderedMap();
    }

    getChannelMessages(channelId, limit = 50 , offset = 0){
        
        return new Promise((resolve, reject) => {
            channelId = new ObjectId(channelId);
            const query =[
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $match: {
                        'channelId': {$eq: channelId},
                    },
                },
                {
                    $project: {
                        _id: true,
                        channelId: true,
                        user: {$arrayElemAt: ['$user', 0]},
                        userId: true,
                        body: true,
                        created: true,
                    }
                },
                {
                    $project: {
                        _id: true,
                        channelId: true,
                        user: {_id: true, name: true, created: true, online: true},
                        userId: true,
                        body: true,
                        created: true,
                    }
                },
                {
                    $limit: limit
                },
                {
                    $skip: offset,
                },
                {
                    $sort: {created: 1}
                }
            ];
            this.app.db.db("mongodbmessenger").collection('messages').aggregate(query).toArray((err, results) => {
                //console.log("hi2 aggregate", resolve(results));
                if(err)
                {
                    console.log("Im having an error")
                }
                return err ?reject(err) : resolve(results);
            });
        });
    }
    create(obj){

        return new Promise( (resolve, reject) => {

            let idd = _.get(obj, '_id');
            const id = _.toString(idd);
            
            const userId = new ObjectId(_.get(obj, 'userId'));
            const channelId = new ObjectId(_.get(obj,'channelId'));
            
            
            const message = {
                _id: new ObjectId(id),
                body: _.get(obj,'body',''),
                userId: userId,
                channelId: channelId,
                created: new Date(),
             };
            console.log("iddddd--msg:",message);
            
            
            this.app.db.db("mongodbmessenger").collection('messages').insertOne(message, (err, info) => {

                if(err){
                    return reject(err);
                }
                //let us update last message field to channel
                this.app.db.db("mongodbmessenger").collection('channels').findOneAndUpdate({_id: channelId}, {
                    $set: {
                        lastMessage: _.get(message, 'body', ''),
                        updated: new Date(),
                    }
                })
                this.app.models.user.load(_.toString(userId)).then((user) =>{
                    _.unset(user, 'password');
                    _.unset(user, 'email');

                    message.user = user;

                    return resolve(message);
                }).catch((err) => {
                    return reject(err);
                });
            });    

        });

    }

}