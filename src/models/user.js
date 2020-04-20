import _ from 'lodash';
import {isEmail} from '../helper';
import bcrypt from 'bcrypt';
import {ObjectID} from 'mongodb';
import {OrderedMap} from 'immutable';

const saltRound = 10;

export default class User{

    constructor(app){
        this.app = app;
        
        this.users = new OrderedMap();
    }
    updateUserStatus(userId, isOnline = false) {

        return new Promise((resolve, reject) => {

            // first update status of cache this.users

            this.users = this.users.update(userId, (user) => {

                if (user) {
                    user.online = isOnline;
                }

                return user;
            });
            console.log("signing off bitches!")
            const query = {_id: new ObjectID(userId)};
            const updater = {$set: {online: isOnline}};
            const db = this.app.db;
            db.db("mongodbmessenger").collection('users').update(query, updater, (err, info) => {
                return err ? reject(err) : resolve(info);
            });


        })
    }

    find(query = {}, options = {}) {
        
        return new Promise((resolve, reject) => {
            const db = this.app.db;
            db.db("mongodbmessenger").collection('users').find(query, options).toArray((err, users) => {
                return err ? reject(err) : resolve(users);
            })
        });
    }


    search(q="") {

        return new Promise((resolve,reject)=> {

            const regex = new RegExp(q,'i');

            const query = {
                $or: [
                    {name: {$regex: regex}},
                    {email: {$regex: regex}}
                ],
            };
            const db = this.app.db;
        db.db("mongodbmessenger").collection('users').find(query,{_id:true,name:true,created:true}).toArray((err,results)=> {
            if(err || !results || !results.length) {
                return reject({message: "Not Found"});  
            }
            return resolve(results);
        });

        });

    }

    login(user) {
        const email = _.get(user, 'email', '');
        const password = _.get(user, 'password', '');
        return new Promise((resolve, reject) => {
            if(!password || !email || !isEmail(email)) {
                return reject({message: "Error in login"})
            }

            //find in database

            this.findUserByEmail(email, (err, result) => {
                if(err) {
                    return reject({message: "Login Error"});
                }
                // if found user compare the password hash and plain text
                const hashPassword = _.get(result, 'password');
                const isMatch = bcrypt.compareSync(password, hashPassword);
                if(!isMatch) {
                    return reject({message: "Login error"});
                }
                // Login successful create new token and save to token collection
                const userId = result._id;
                this.app.models.token.create(userId).then((token) => {
                    token.user = result;
                    return resolve(token);
                }).catch(err => {
                    return reject({message: "Login Error"});
                });
            })
        })

    }


    findUserByEmail(email, callback = () => {}) {
        const db = this.app.db;
        db.db("mongodbmessenger").collection('users').findOne({email: email}, (err, result) => {
            if(err || !result) {
                return callback({message: "User not found"})
            }

            return callback(null, result);
        })
    }

    load(id) {

        id = `${id}`;
        // eslint-disable-next-line no-undef
        return new Promise((resolve, reject) => {
            // find in cache if found we return and dont need to query db
            const userInCache = this.users.get(id);
            if(userInCache) {
                return resolve(userInCache);
            }
            // if not found then start query db
            this.findUserById(id, (err, user) => {
                if(!err && user) {
                    this.users = this.users.set(id, user);
                }
                return err ? reject(err) : resolve(user);
            });
      
        })
    }

    findUserById(id, callback = () => {}) {
        console.log("Query in Database");
        const db = this.app.db;
        if(!id) {
            return callback({message: "User not found"}, null);
        }
        const userId = new ObjectID(id);
        db.db("mongodbmessenger").collection('users').findOne({_id: userId}, (err, result) => {
            if(err || !result) {
                return callback({message: "User not found"});

            }
            return callback(null, result);
        });
    }
    beforeSave(user, callback = () => {}){

        //first validate the user object before save to user collection
        let errors = [];
        const fields  = ['name', 'email', 'password'];
        const validations = {
            name: {
                errorMessage: 'Name is required',
                do: () => {

                    const name = _.get(user, 'name', '');

                    return name.length; 
                }
            },
            email: {
                errorMessage: 'Email is not correct',
                do: () => {
                    const email = _.get(user, 'email', '');
                    if(!email.length || !isEmail(email)){
                        return false;
                    }
                    return true;   
                }
            },
            password: {
                errorMessage: 'Password is required and more than 3 characters',
                do: () => {
                    const password = _.get(user, 'password', '');
                    if(!password.length || password.length < 3){
                        return false; 
                    }
                    return true;
                }
            }
        }


        fields.forEach((field) => {

            const fieldValidation = _.get(validations, field);

            if(fieldValidation){
                // do check
                const isValid = fieldValidation.do();
                const msg = fieldValidation.errorMessage;
                if(!isValid){
                    errors.push(msg);
                }
            }

        });

        
        if(errors.length){

            //validation test not passed 

            const err = _.join(errors, ',');
            return callback(err, null);
        }
        
        const db = this.app.db;
        //check if email already exists in db
        const email = _.toLower(_.trim(_.get(user, 'email','')));
        db.db("mongodbmessenger").collection('users').findOne({email: email}, (err, result) => {
            console.log("Checking Email with result:", err, result);
            if(err || result) {
                return callback({message: "Email already Exist"}, null);
            }

            // return callback with success checked
            const password = _.get(user, 'password');
            const hashPassword = bcrypt.hashSync(password, saltRound);

            const userFormatted = {
                name: `${_.trim(_.get(user, 'name'))}`,
                email: email,
                password: hashPassword,
                created: new Date()
            };

            return callback(null, userFormatted);
        });
    }

    

    create(user){

        const db = this.app.db;
        console.log("User", user);
        return new Promise((resolve, reject) => {
            
            
            this.beforeSave(user, (err, user) => {

                console.log("After validation: ", err,user);
                console.log("Error ta nul hi hai",err);
                if(err){
                    return reject(err);
                }

                // insert new user object to user collection

                //console.log("just to check db is correct here",db);
                db.db("mongodbmessenger").collection('users').insertOne(user, (err, info) => {

                    console.log("coming in here.....")
                    // check if error return error to user 
                    if(err){

                        return reject({ message : "An error saving user"});
                    }
                    //otherwise return user object to user
                    const userId = _.get(user, '_id').toString();
                    this.users = this.users.set(userId, user);

                    return resolve(user);

                });


            });
           
        });
    }

}