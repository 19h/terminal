'use strict';

let koa = require('koa.io');
let app = koa();

let yubi = require('yub');
    yubi.init('24716', 'pdLmq54ttw8L01lVsMi8egPwgoY=');

let msgpack = require('./msgpack'),
    helpers = new (require('./helpers'));

let arr = (item) => Array.prototype.slice.call(item);

let crypto = require('crypto');
let sodium = require('sodium');

let assert = require('assert');

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
			// verify checksum
			if (helpers.bsd16(packet) !== checksum)
				throw new Error('Bad checksum.');

			// unpack payload
			let upacket = packet.split('').map((item) => item.charCodeAt(0));
			    upacket = msgpack.unpack(Buffer(upacket));

			if (!(upacket.user in users))
				throw new Error('Invalid user.');

			if (helpers.isArray(upacket.authedHandshake, 32)
			 && helpers.isArray(upacket.nonce, 24)
			 && helpers.isArray(upacket.publicKey, 32)
			) {
				let nonce = Buffer(upacket.nonce);
				let publicKey = Buffer(upacket.publicKey);

				/* Auth(H(nonce, secret) λ publickey) */
				let authedHandshake = Buffer(upacket.authedHandshake);

				// sha256 hash of secret
				let secretHash = crypto.createHash('sha256').update(users[upacket.user].secret).digest();

				// verify that user is in possession of correct hash
				if (sodium.api.crypto_auth_verify(authedHandshake, nonce, secretHash)) {
					throw new Error('Invalid secret.');
				}

				this.keyChain = {
					nonce: nonce,
					publicKey: publicKey
				};

				this.privateKeyChain = sodium.api.crypto_box_keypair();

				this.privateKeyChain.nonce = new Buffer(sodium.api.crypto_box_NONCEBYTES);

				sodium.api.randombytes_buf(this.privateKeyChain.nonce);

				this.emit('rpc', msgpack.pack({
					type: 'handshake',
					// used for ed25519
					publicKey: arr(this.privateKeyChain.publicKey),
					nonce: arr(this.privateKeyChain.nonce)
				}));
			}
		} catch(e) {
			return this.emit('err', e.message);
		}
	}
});

app.listen(3000);
