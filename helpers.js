'use strict';

module.exports = class Helpers {
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
}
