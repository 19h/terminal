'use strict';

let koa = require('koa.io');
let app = koa();

let yubi = require('yub');
    yubi.init('24716', 'pdLmq54ttw8L01lVsMi8egPwgoY=');

let users = require('./users.json');

app.use(require('koa-static')('static'));

// middleware for koa
app.use(function*() {

});

// middleware for scoket.io's connect and disconnect
app.io.use(function*(next) {
	yield* next;
});

// router for socket event
app.io.route('login', function*(msg) {
	console.log(this.data);

	if (this.data.length) {

	}

	this.emit('hi', 'sup');
});

app.listen(3000);