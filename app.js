'use strict';

import crypto from 'crypto';

import express from 'express';
import socketio from 'socket.io';

import sodium from 'sodium';

import yubi from 'yub';
import msgpack from 'msgpack';

import users from './users.json';

import {
	createServer
} from 'http';

import {
	Helpers
} from './helpers';

const helpers = new Helpers();

const app = express();

const server = createServer(app);

const io = socketio(server, {
	path: '/io'
});

yubi.init('24716', 'pdLmq54ttw8L01lVsMi8egPwgoY=');

class Handler {
	constructor ({sock, user}) {
		this.user = user;
		this.sock = sock;
	}

	getUser () {
		return this.user;
	}

	commitMessage (msg) {
		msg = msgpack.pack(msg);

		const cipher = sodium.api.crypto_box_easy(
			msg,
			this.user.bob.nonce,
			this.user.alice.publicKey,
			this.user.bob.secretKey
		);

		this.sock.emit('exec', [...cipher]);
	}

	parse (command) {
		if (!command.length) {
			return this.commitMessage('Command must not be empty.');
		}

		console.log(command);

		return this.commitMessage('Unknown command.');
	}
}

io.on('connection', sock => {
	const user = {};
	const handler = new Handler({
		sock, user
	});

	sock.on('handshake', packet => {
		if (packet) {
			try {
				// unpack payload
				let upacket = helpers.unpackChunk(packet);

				if (!(upacket.user in users))
					throw new Error('Invalid user.');

				if (helpers.isArray(upacket.authedHandshake, 32)
				 && helpers.isArray(upacket.nonce, 24)
				 && helpers.isArray(upacket.publicKey, 32)
				) {
					const nonce = new Buffer(upacket.nonce);
					const publicKey = new Buffer(upacket.publicKey);

					/* Auth(H(nonce, secret) λ publickey) */
					const authedHandshake = new Buffer(upacket.authedHandshake);

					// sha256 hash of secret
					const secretHash = crypto.createHash('sha256').update(users[upacket.user].secret).digest();

					// verify that user is in possession of correct hash
					if (helpers.verifyAuthenticatedChunk(authedHandshake, nonce, secretHash)) {
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

					sock.emit('rpc', helpers.packChunk({
						type: 'handshake',
						// used for ed25519
						publicKey: [...user.bob.publicKey],
						nonce: [...user.bob.nonce]
					}));
				}
			} catch(e) {
				return sock.emit('err', e.message);
			}
		}
	});

	sock.on('post-handshake', cipher => {
		cipher = helpers.unpackChunk(cipher);

		const plaintext = String.fromCharCode.apply(String, sodium.api.crypto_box_open_easy(
			new Buffer(cipher),
			user.alice.nonce,
			user.alice.publicKey,
			user.bob.secretKey
		));

		if (plaintext === 'init') {
			user.alice.authenticated = true;

			sock.emit('post-auth', user.alice.userName, [...sodium.api.crypto_auth(user.bob.nonce, user.alice.secretHash)]);
		}
	});

	sock.on('command', (cipher, tag) => {
		if (!user.alice.authenticated) {
			return;
		}

		const packedCommand = String.fromCharCode.apply(String, sodium.api.crypto_box_open_easy(
			new Buffer(cipher),
			user.alice.nonce,
			user.alice.publicKey,
			user.bob.secretKey
		));

		if (!helpers.verifyAuthenticatedIntegrityChunk(packedCommand, tag, user.alice.secretHash)) {
			return sock.emit('err', 'Invalid integrity for command.');
		}

		const command = JSON.parse(packedCommand);

		if (users[user.alice.userName].yubi && !user.alice.yubiAuthenticated) {
			if (command.length !== 2 || command[0] !== 'yubi') {
				return sock.emit('err', `'${user.alice.userName}' requires yubikey authentication.`);
			}

			yubi.verify(command[1], (err, data) => {
				if (err) {
					return sock.emit('err', err.message);
				}

				const userYubi = users[user.alice.userName].yubi;

				if (!data.valid || data.serial !== userYubi.serial || data.identity !== userYubi.identity) {
					return sock.emit('err', 'OTP rejected.');
				}

				user.alice.yubiAuthenticated = true;

				return sock.emit('info', 'OTP accepted.');
			});
		}

		handler.parse(command);
	});

	sock.error(err => console.log(err));
});


const assetSource = './static';

console.log('Using \'%s\' for static assets.', assetSource);

app.use(express.static(assetSource, {
	// allow downstream services to respond first
	etag: true,
	maxage: 6 * 3600
}));

server.listen(3000);
