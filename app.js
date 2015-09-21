'use strict';

let koa = require('koa.io');
let app = koa();

let yubi = require('yub');
    yubi.init('24716', 'pdLmq54ttw8L01lVsMi8egPwgoY=');

let msgpack = require('./msgpack'),
    helpers = new (require('./helpers'));

let users = require('./users.json');

app.use(require('koa-gzip')());
app.use(require('koa-conditional-get')());
app.use(require('koa-etag')());

app.use(require('koa-static')('static'));

// middleware for koa
app.use(function*() {

});

// middleware for socket.io's connect and disconnect
app.io.use(function*(next) {
	yield* next;
});

// router for socket event
app.io.route('handshake', function*(msg) {
	if (this.data.length === 2) {
		let packet = this.data[0], checksum = this.data[1];

		try {
			if (helpers.bsd16(packet) !== checksum) return;

			packet = msgpack.unpack(Buffer(packet.split('').map((item) => item.charCodeAt(0))));

			console.log(Buffer(packet.publicKey))
		} catch(e) {
			console.log(e);
		}
	}
});

app.listen(3000);
