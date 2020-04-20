import _ from 'lodash';
import { OrderedMap } from 'immutable';
export default class Realtime {
    constructor(store) {
        this.store = store;
        this.ws = null;
        this.isConnected = false;
        this.connect();
        this.reconnect();
    }

    reconnect() {
        const store=this.store;

        window.setInterval(()=>{

            const user = store.getCurrentUser();
            if(user && !this.isConnected) {
                this.connect();

            }

        },3000)
    }

    decodeMessage(msg) {
        let message = {};
        try {
            message = JSON.parse(msg);
        } catch (err) {
            console.log(err);
        }
        return message;
    }

    readMessage(msg) {
        const store = this.store;
        const currentUser = store.getCurrentUser();
        const currentUserId = _.toString(_.get(currentUser, '_id'));
        const message = this.decodeMessage(msg);
        const action = _.get(message, 'action', '');
        const payload = _.get(message, 'payload');

        switch (action) {

            case 'user-offline':
                this.onUpdateUserStatus(payload, false);
                break;


            case 'user_online':
                const isOnline = true;
                this.onUpdateUserStatus(payload, isOnline);
                break;

            case 'message_added':
                const activeChannel = store.getActiveChannel();
                let notify = _.get(activeChannel, '_id') !== _.get(payload, 'channelId') && currentUserId !== _.get(payload, 'userId');
                this.onAddMessage(payload, notify);
                break;

            case 'channel_added':
                this.onAddChannel(payload);
                break;
            default:
                break;
        }

    }//, notify = false

    onUpdateUserStatus(userId, isOnline = false) {

        const store = this.store;
        store.users = store.users.update(userId, (user) => {

            if (user) {
                user.online = isOnline;
            }

            return user;
        });

        store.update();

    }
    onAddMessage(payload, notify = false) {
        const store = this.store;
        let user = _.get(payload, 'user');
        //add the user to cache
        user = store.addUserToCache(user);
        const currentUser = store.getCurrentUser();
        const currentUserId = _.toString(_.get(currentUser, '_id'));
        const messageObject = {
            _id: payload._id,
            body: _.get(payload, 'body', ''),
            userId: _.get(payload, 'userId'),
            channelId: _.get(payload, 'channelId'),
            created: _.get(payload, 'created', new Date()),
            me: currentUserId === _.toString(_.get(payload, 'userId')),
            user: user,
        };

        store.setMessage(messageObject, notify);
    }

    onAddChannel(payload) {

        const store = this.store;
        const channelId = _.toString(_.get(payload, '_id'));
        const userId = `${payload.userId}`;
        const users = _.get(payload, 'users', []);

        let channel = {
            _id: channelId,
            title: _.get(payload, 'title', ''),
            lastMessage: _.get(payload, 'lastMessage'),
            members: new OrderedMap(),
            messages: new OrderedMap(),
            isNew: false,
            userid: userId,
            created: new Date()
        };

        _.each(users, (user) => {
            // add this user to store users collection
            const memberId = `${user._id}`;
            this.store.addUserToCache(user);
            channel.members = channel.members.set(memberId, true);
        })

        const channelMessages = store.messages.filter((m) => _.toString(m.channelId) === channelId);
        channelMessages.forEach((msg) => {
            const msgId = _.toString(_.get(msg, '_id'));
            channel.messages = channel.messages.set(msgId, true);
        })
        store.addChannel(channelId, channel);
    }

    send(msg = {}) {
        const isConnected = this.isConnected;
        if (this.ws && isConnected) {
            const messageString = JSON.stringify(msg);
            this.ws.send(messageString);
        }
    }

    authentication() {
        const tokenId = this.store.getUserTokenId();
        if (tokenId) {
            const message = {
                action: 'auth',
                payload: `${tokenId}`
            }
            this.send(message);
        }

    }

    connect() {
        const ws = new WebSocket('ws://localhost:3001');
        this.ws = ws;
        ws.onopen = () => {
            // console.log("You are connected");
            this.isConnected = true;
            this.authentication();

            ws.onmessage = (event) => {
                this.readMessage(_.get(event, 'data'));
                console.log("Message from server", event.data);
            }

        }

        ws.onclose = () => {
            console.log("You are disconnected");
            this.isConnected = false;
           this.store.update();
        }

        ws.onerror = () => {
            this.isConnected=false;
            this.store.update();
        }
    }
}