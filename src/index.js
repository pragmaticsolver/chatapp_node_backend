import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import initializeDb from './db';
import middleware from './middleware';
import api from './api';
import config from './config.json';
import User from './models/users';
import Message from './models/messages';

let app = express();
app.server = http.createServer(app);

const io = require('socket.io')(app.server);

// logger
app.use(morgan('dev'));

// 3rd party middleware
// app.use(cors({
// 	exposedHeaders: config.corsHeaders
// }));
app.use(cors());

app.use(bodyParser.json({
	limit : config.bodyLimit
}));
var socketusers = [];
let newUsers = [];

var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hirokisuo@gmail.com',
    pass: 'uhqobepcqmtvpaod'
  }
});

// initializeDb();
// connect to db
initializeDb( db => {
	// Socket Connection Handler
	
	io.on('connection', socket => {
		let nb = 0;
		console.log(`SocketIO > Connected socket ${socket.id}`);

		socket.on('new user', async function (data) {
			var isExisting = false;

			for (var i=0; i<newUsers.length; i++) {
				if (newUsers[i].email == data.email) {
					newUsers[i] = data;
					isExisting = true;
				}
			}

			if (!isExisting) {
				newUsers.push(data);
			}

			socket.email = data.email;
			socketusers[data.email] = socket;
			let users = [];
			try {
				users = await User.find({});
				for (var i=0; i<users.length; i++) {
					users[i].isOnline = false;
					for (var j=0; j<newUsers.length; j++) {
						if (users[i].email == newUsers[j].email) {
							users[i].isOnline = true;
						}
					}
				}
			} catch(err) {
				console.log(err);
			}

			io.emit('online-users', users);
		});

		socket.on('get-users', async (data) => {
			let users = [];
			try {
				users = await User.find({});
				for (var i=0; i<users.length; i++) {
					users[i].isOnline = false;
					for (var j=0; j<newUsers.length; j++) {
						if (users[i].email == newUsers[j].email) {
							users[i].isOnline = true;
						}
					}
				}
			} catch(err) {
				console.log(err);
			}

			console.log('socket users: ', users);
			io.emit('online-users', users);
		});

		socket.on('broadcast', message => {
			++nb;
			io.emit('broadcast', message); // Emit to all connected clients
		});

		socket.on('private', message => {
			console.log('message: ', socketusers);
			if (socketusers[message.user]) {
				socketusers[message.user].emit('send notification', message.data);
			}
		});

		socket.on('send-message', async (message) => {

			let newMessage = new Message({
				to: message.to._id,
				from: message.from._id,
				type: message.type,
				message: message.data.text ? message.data.text : message.data.emoji
			});

			try {
				await newMessage.save();
			} catch(err) {
				console.log(err);
			}

			if (socketusers[message.to.email]) {
				socketusers[message.to.email].emit('message', message);
			} else {
				var mailOptions = {
					from: 'from_user@gmail.com',
					to: `${message.to.email}`,
					subject: `New message from ${message.from.name}`,
					text: `${message.data.text ? message.data.text : 'Please check your chat box'}`
				};
				
				transporter.sendMail(mailOptions, function(error, info){
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
			}
		});

		socket.on('disconnect', async function (data) {
			var disconnectedEmail;

			Object.keys(socketusers).map((item, index) => {
				if (socketusers[item].disconnected) {
					disconnectedEmail = item;
				}
			});

			let tempUsers = [];

			for (var i=0; i<newUsers.length; i++) {
				if (newUsers[i].email != disconnectedEmail) {
					tempUsers.push(newUsers[i]);
				}
			}

			newUsers = tempUsers;
			let users = [];
			try {
				users = await User.find({});
				for (var i=0; i<users.length; i++) {
					users[i].isOnline = false;
					for (var j=0; j<newUsers.length; j++) {
						if (users[i].email == newUsers[j].email) {
							users[i].isOnline = true;
						}
					}
				}
			} catch(err) {
				console.log(err);
			}

			io.emit('online-users', users);
			delete socketusers[disconnectedEmail];
		});
	});

	// Default Route
	app.get('/', (req, res) => res.json({
		message: 'Socket Server',
		error: false,
		status: true,
		environment: process.env['NODE_ENV']
	}))

	// internal middleware
	app.use(middleware({ config, db }));

	// api router
	app.use('/api', api({ config, db }));

	app.server.listen(process.env.PORT || config.port, () => {
		console.log(`Started on port ${app.server.address().port}`);
	});
});

export default app;
