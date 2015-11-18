'use strict';

const msgpack = require('msgpack');
const sodium = require('sodium');

export class Helpers {
	bsd16 (arr) {
		let c = 0, i = 0, l = arr.length;

		for(; i < l; i++) c = (((((c >>> 1) + ((c & 1) << 15)) | 0) + (arr[i] & 0xff)) & 0xffff) | 0;

		return c;
	}

	isArray (item, n) {
		if (item instanceof Array && item.length === n) {
			return true;
		}

		return false;
	}

	verifyAuthenticatedChunk (tag, nonce, secretKey) {
		return sodium.api.crypto_auth_verify(tag, nonce, secretKey);
	}

	verifyAuthenticatedIntegrityChunk (chunk, tag, secretKey) {
		if (!this.verifyAuthenticatedChunk(new Buffer(tag), new Buffer(chunk), new Buffer(secretKey))) {
			return false;
		}

		return true;
	}

	unpackChunk (chunk) {
		// unpack payload
		let unpacked = chunk.split('').map((item) => item.charCodeAt(0));
		    unpacked = msgpack.unpack(new Buffer(unpacked));

		return unpacked;
	}

	packChunk (chunk) {
		return msgpack.pack(chunk);
	}
};
