'use strict';

let express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {
	path: '/io'
});

let yubi = require('yub');
    yubi.init('24716', 'pdLmq54ttw8L01lVsMi8egPwgoY=');

let msgpack = require('msgpack'),
    helpers = new (require('./helpers'));

let arr = item => Array.prototype.slice.call(item);

let crypto = require('crypto');
let sodium = require('sodium');

let assert = require('assert');

let users = require('./users.json');

io.on('connection', sock => {
	let user = {};

	sock.on('handshake', (packet, checksum) => {
		if (packet && checksum) {
			try {
				// verify checksum
				if (helpers.bsd16(packet) !== checksum)
					throw new Error('Bad checksum.');

				// unpack payload
				let upacket = packet.split('').map((item) => item.charCodeAt(0));
				    upacket = msgpack.unpack(new Buffer(upacket));

				if (!(upacket.user in users))
					throw new Error('Invalid user.');

				if (helpers.isArray(upacket.authedHandshake, 32)
				 && helpers.isArray(upacket.nonce, 24)
				 && helpers.isArray(upacket.publicKey, 32)
				) {
					let nonce = new Buffer(upacket.nonce);
					let publicKey = new Buffer(upacket.publicKey);

					/* Auth(H(nonce, secret) λ publickey) */
					let authedHandshake = new Buffer(upacket.authedHandshake);

					// sha256 hash of secret
					let secretHash = crypto.createHash('sha256').update(users[upacket.user].secret).digest();

					// verify that user is in possession of correct hash
					if (sodium.api.crypto_auth_verify(authedHandshake, nonce, secretHash)) {
						throw new Error('Invalid secret.');
					}

					user.alice = {
						nonce: nonce,
						publicKey: publicKey,
						secretHash: secretHash,
						userName: upacket.user
					};

					user.bob = sodium.api.crypto_box_keypair();

					user.bob.nonce = new Buffer(sodium.api.crypto_box_NONCEBYTES);

					sodium.api.randombytes_buf(user.bob.nonce);

					sock.emit('rpc', msgpack.pack({
						type: 'handshake',
						// used for ed25519
						publicKey: arr(user.bob.publicKey),
						nonce: arr(user.bob.nonce)
					}));
				}
			} catch(e) {
				return sock.emit('err', e.message);
			}
		}
	});

	sock.on('post-handshake', cipher => {
		let plaintext = String.fromCharCode.apply(String, sodium.api.crypto_box_open_easy(
			new Buffer(cipher),
			user.alice.nonce,
			user.alice.publicKey,
			user.bob.secretKey
		));

		if (plaintext === 'init') {
			user.alice.authenticated = true;

			sock.emit('post-auth', user.alice.userName, arr(sodium.api.crypto_auth(user.bob.nonce, user.alice.secretHash)));
		}
	});

	sock.on('command', cmd => {
		if (!user.alice.authenticated) {
			return;
		}

		if (users[user.alice.userName].yubi && !user.alice.yubiAuthenticated) {
			if (cmd.length !== 2 || cmd[0] !== 'yubi') {
				return sock.emit('err', `'${user.alice.userName}' requires yubikey authentication.`);
			}

			yubi.verify(cmd[1], function(err, data) {
				if (err) {
					return sock.emit('err', err.message);
				}

				let userYubi = users[user.alice.userName].yubi;

				console.log(userYubi, data);

				if (!data.valid || data.serial !== userYubi.serial || data.identity !== userYubi.identity) {
					return sock.emit('err', 'OTP rejected.');
				}

				user.alice.yubiAuthenticated = true;

				return sock.emit('info', 'OTP accepted.');
			});
		}

		return sock.emit('info', 'Hi.');
	});

	sock.error(err => console.log(err));
});


let assetSource = './static';

console.log('Using \'%s\' for static assets.', assetSource);

app.use(express.static(assetSource, {
	// allow downstream services to respond first
	etag: true,
	maxage: 6 * 3600
}));

server.listen(3000);
