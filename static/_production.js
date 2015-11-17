(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var proto = {}
module.exports = proto

proto.from = require('./from.js')
proto.to = require('./to.js')
proto.is = require('./is.js')
proto.subarray = require('./subarray.js')
proto.join = require('./join.js')
proto.copy = require('./copy.js')
proto.create = require('./create.js')

mix(require('./read.js'), proto)
mix(require('./write.js'), proto)

function mix(from, into) {
  for(var key in from) {
    into[key] = from[key]
  }
}

},{"./copy.js":3,"./create.js":4,"./from.js":5,"./is.js":6,"./join.js":7,"./read.js":9,"./subarray.js":10,"./to.js":11,"./write.js":12}],2:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],3:[function(require,module,exports){
module.exports = copy

var slice = [].slice

function copy(source, target, target_start, source_start, source_end) {
  target_start = arguments.length < 3 ? 0 : target_start
  source_start = arguments.length < 4 ? 0 : source_start
  source_end = arguments.length < 5 ? source.length : source_end

  if(source_end === source_start) {
    return
  }

  if(target.length === 0 || source.length === 0) {
    return
  }

  if(source_end > source.length) {
    source_end = source.length
  }

  if(target.length - target_start < source_end - source_start) {
    source_end = target.length - target_start + source_start
  }

  if(source.buffer !== target.buffer) {
    return fast_copy(source, target, target_start, source_start, source_end)
  }
  return slow_copy(source, target, target_start, source_start, source_end)
}

function fast_copy(source, target, target_start, source_start, source_end) {
  var len = (source_end - source_start) + target_start

  for(var i = target_start, j = source_start;
      i < len;
      ++i,
      ++j) {
    target[i] = source[j]
  }
}

function slow_copy(from, to, j, i, jend) {
  // the buffers could overlap.
  var iend = jend + i
    , tmp = new Uint8Array(slice.call(from, i, iend))
    , x = 0

  for(; i < iend; ++i, ++x) {
    to[j++] = tmp[x]
  }
}

},{}],4:[function(require,module,exports){
module.exports = function(size) {
  return new Uint8Array(size)
}

},{}],5:[function(require,module,exports){
module.exports = from

var base64 = require('base64-js')

var decoders = {
    hex: from_hex
  , utf8: from_utf
  , base64: from_base64
}

function from(source, encoding) {
  if(Array.isArray(source)) {
    return new Uint8Array(source)
  }

  return decoders[encoding || 'utf8'](source)
}

function from_hex(str) {
  var size = str.length / 2
    , buf = new Uint8Array(size)
    , character = ''

  for(var i = 0, len = str.length; i < len; ++i) {
    character += str.charAt(i)

    if(i > 0 && (i % 2) === 1) {
      buf[i>>>1] = parseInt(character, 16)
      character = '' 
    }
  }

  return buf 
}

function from_utf(str) {
  var arr = []
    , code

  for(var i = 0, len = str.length; i < len; ++i) {
    code = fixed_cca(str, i)

    if(code === false) {
      continue
    }

    if(code < 0x80) {
      arr[arr.length] = code

      continue
    }

    codepoint_to_bytes(arr, code)
  }

  return new Uint8Array(arr)
}

function codepoint_to_bytes(arr, code) {
  // find MSB, use that to determine byte count
  var copy_code = code
    , bit_count = 0
    , byte_count
    , prefix
    , _byte
    , pos

  do {
    ++bit_count
  } while(copy_code >>>= 1)

  byte_count = Math.ceil((bit_count - 1) / 5) | 0
  prefix = [0, 0, 0xc0, 0xe0, 0xf0, 0xf8, 0xfc][byte_count]
  pos = [0, 0, 3, 4, 5, 6, 7][byte_count]

  _byte |= prefix

  bit_count = (7 - pos) + 6 * (byte_count - 1)

  while(bit_count) {
    _byte |= +!!(code & (1 << bit_count)) << (7 - pos)
    ++pos

    if(pos % 8 === 0) {
      arr[arr.length] = _byte
      _byte = 0x80
      pos = 2
    }

    --bit_count
  }

  if(pos) {
    _byte |= +!!(code & 1) << (7 - pos)
    arr[arr.length] = _byte
  }
}

function pad(str) {
  while(str.length < 8) {
    str = '0' + str
  }

  return str
}

function fixed_cca(str, idx) {
  idx = idx || 0

  var code = str.charCodeAt(idx)
    , lo
    , hi

  if(0xD800 <= code && code <= 0xDBFF) {
    lo = str.charCodeAt(idx + 1)
    hi = code

    if(isNaN(lo)) {
      throw new Error('High surrogate not followed by low surrogate')
    }

    return ((hi - 0xD800) * 0x400) + (lo - 0xDC00) + 0x10000
  }

  if(0xDC00 <= code && code <= 0xDFFF) {
    return false
  }

  return code
}

function from_base64(str) {
  return new Uint8Array(base64.toByteArray(str)) 
}

},{"base64-js":2}],6:[function(require,module,exports){

module.exports = function(buffer) {
  return buffer instanceof Uint8Array;
}

},{}],7:[function(require,module,exports){
module.exports = join

function join(targets, hint) {
  if(!targets.length) {
    return new Uint8Array(0)
  }

  var len = hint !== undefined ? hint : get_length(targets)
    , out = new Uint8Array(len)
    , cur = targets[0]
    , curlen = cur.length
    , curidx = 0
    , curoff = 0
    , i = 0

  while(i < len) {
    if(curoff === curlen) {
      curoff = 0
      ++curidx
      cur = targets[curidx]
      curlen = cur && cur.length
      continue
    }
    out[i++] = cur[curoff++] 
  }

  return out
}

function get_length(targets) {
  var size = 0
  for(var i = 0, len = targets.length; i < len; ++i) {
    size += targets[i].byteLength
  }
  return size
}

},{}],8:[function(require,module,exports){
var proto
  , map

module.exports = proto = {}

map = typeof WeakMap === 'undefined' ? null : new WeakMap

proto.get = !map ? no_weakmap_get : get

function no_weakmap_get(target) {
  return new DataView(target.buffer, 0)
}

function get(target) {
  var out = map.get(target.buffer)
  if(!out) {
    map.set(target.buffer, out = new DataView(target.buffer, 0))
  }
  return out
}

},{}],9:[function(require,module,exports){
module.exports = {
    readUInt8:      read_uint8
  , readInt8:       read_int8
  , readUInt16LE:   read_uint16_le
  , readUInt32LE:   read_uint32_le
  , readInt16LE:    read_int16_le
  , readInt32LE:    read_int32_le
  , readFloatLE:    read_float_le
  , readDoubleLE:   read_double_le
  , readUInt16BE:   read_uint16_be
  , readUInt32BE:   read_uint32_be
  , readInt16BE:    read_int16_be
  , readInt32BE:    read_int32_be
  , readFloatBE:    read_float_be
  , readDoubleBE:   read_double_be
}

var map = require('./mapped.js')

function read_uint8(target, at) {
  return target[at]
}

function read_int8(target, at) {
  var v = target[at];
  return v < 0x80 ? v : v - 0x100
}

function read_uint16_le(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, true)
}

function read_uint32_le(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, true)
}

function read_int16_le(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, true)
}

function read_int32_le(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, true)
}

function read_float_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, true)
}

function read_double_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, true)
}

function read_uint16_be(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, false)
}

function read_uint32_be(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, false)
}

function read_int16_be(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, false)
}

function read_int32_be(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, false)
}

function read_float_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, false)
}

function read_double_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, false)
}

},{"./mapped.js":8}],10:[function(require,module,exports){
module.exports = subarray

function subarray(buf, from, to) {
  return buf.subarray(from || 0, to || buf.length)
}

},{}],11:[function(require,module,exports){
module.exports = to

var base64 = require('base64-js')
  , toutf8 = require('to-utf8')

var encoders = {
    hex: to_hex
  , utf8: to_utf
  , base64: to_base64
}

function to(buf, encoding) {
  return encoders[encoding || 'utf8'](buf)
}

function to_hex(buf) {
  var str = ''
    , byt

  for(var i = 0, len = buf.length; i < len; ++i) {
    byt = buf[i]
    str += ((byt & 0xF0) >>> 4).toString(16)
    str += (byt & 0x0F).toString(16)
  }

  return str
}

function to_utf(buf) {
  return toutf8(buf)
}

function to_base64(buf) {
  return base64.fromByteArray(buf)
}


},{"base64-js":2,"to-utf8":15}],12:[function(require,module,exports){
module.exports = {
    writeUInt8:      write_uint8
  , writeInt8:       write_int8
  , writeUInt16LE:   write_uint16_le
  , writeUInt32LE:   write_uint32_le
  , writeInt16LE:    write_int16_le
  , writeInt32LE:    write_int32_le
  , writeFloatLE:    write_float_le
  , writeDoubleLE:   write_double_le
  , writeUInt16BE:   write_uint16_be
  , writeUInt32BE:   write_uint32_be
  , writeInt16BE:    write_int16_be
  , writeInt32BE:    write_int32_be
  , writeFloatBE:    write_float_be
  , writeDoubleBE:   write_double_be
}

var map = require('./mapped.js')

function write_uint8(target, value, at) {
  return target[at] = value
}

function write_int8(target, value, at) {
  return target[at] = value < 0 ? value + 0x100 : value
}

function write_uint16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, true)
}

function write_uint32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, true)
}

function write_int16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, true)
}

function write_int32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, true)
}

function write_float_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, true)
}

function write_double_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, true)
}

function write_uint16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, false)
}

function write_uint32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, false)
}

function write_int16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, false)
}

function write_int32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, false)
}

function write_float_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, false)
}

function write_double_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, false)
}

},{"./mapped.js":8}],13:[function(require,module,exports){
/*global define:false require:false */
module.exports = (function(){
	// Import Events
	var events = require('events')

	// Export Domain
	var domain = {}
	domain.createDomain = domain.create = function(){
		var d = new events.EventEmitter()

		function emitError(e) {
			d.emit('error', e)
		}

		d.add = function(emitter){
			emitter.on('error', emitError)
		}
		d.remove = function(emitter){
			emitter.removeListener('error', emitError)
		}
		d.bind = function(fn){
			return function(){
				var args = Array.prototype.slice.call(arguments)
				try {
					fn.apply(null, args)
				}
				catch (err){
					emitError(err)
				}
			}
		}
		d.intercept = function(fn){
			return function(err){
				if ( err ) {
					emitError(err)
				}
				else {
					var args = Array.prototype.slice.call(arguments, 1)
					try {
						fn.apply(null, args)
					}
					catch (err){
						emitError(err)
					}
				}
			}
		}
		d.run = function(fn){
			try {
				fn()
			}
			catch (err) {
				emitError(err)
			}
			return this
		};
		d.dispose = function(){
			this.removeAllListeners()
			return this
		};
		d.enter = d.exit = function(){
			return this
		}
		return d
	};
	return domain
}).call(this)
},{"events":14}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],15:[function(require,module,exports){
module.exports = to_utf8

var out = []
  , col = []
  , fcc = String.fromCharCode
  , mask = [0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
  , unmask = [
      0x00
    , 0x01
    , 0x02 | 0x01
    , 0x04 | 0x02 | 0x01
    , 0x08 | 0x04 | 0x02 | 0x01
    , 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x40 | 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
  ]

function to_utf8(bytes, start, end) {
  start = start === undefined ? 0 : start
  end = end === undefined ? bytes.length : end

  var idx = 0
    , hi = 0x80
    , collecting = 0
    , pos
    , by

  col.length =
  out.length = 0

  while(idx < bytes.length) {
    by = bytes[idx]
    if(!collecting && by & hi) {
      pos = find_pad_position(by)
      collecting += pos
      if(pos < 8) {
        col[col.length] = by & unmask[6 - pos]
      }
    } else if(collecting) {
      col[col.length] = by & unmask[6]
      --collecting
      if(!collecting && col.length) {
        out[out.length] = fcc(reduced(col, pos))
        col.length = 0
      }
    } else { 
      out[out.length] = fcc(by)
    }
    ++idx
  }
  if(col.length && !collecting) {
    out[out.length] = fcc(reduced(col, pos))
    col.length = 0
  }
  return out.join('')
}

function find_pad_position(byt) {
  for(var i = 0; i < 7; ++i) {
    if(!(byt & mask[i])) {
      break
    }
  }
  return i
}

function reduced(list) {
  var out = 0
  for(var i = 0, len = list.length; i < len; ++i) {
    out |= list[i] << ((len - i - 1) * 6)
  }
  return out
}

},{}],16:[function(require,module,exports){
"use strict";function EventEmitter(){EventEmitter.init.call(this)}function $getMaxListeners(e){return void 0===e._maxListeners?EventEmitter.defaultMaxListeners:e._maxListeners}function emitNone(e,t,n){if(t)e.call(n);else{t=e.length,e=arrayClone(e,t);for(var r=0;t>r;++r)e[r].call(n)}}function emitOne(e,t,n,r){if(t)e.call(n,r);else{t=e.length,e=arrayClone(e,t);for(var i=0;t>i;++i)e[i].call(n,r)}}function emitTwo(e,t,n,r,i){if(t)e.call(n,r,i);else{t=e.length,e=arrayClone(e,t);for(var s=0;t>s;++s)e[s].call(n,r,i)}}function emitThree(e,t,n,r,i,s){if(t)e.call(n,r,i,s);else{t=e.length,e=arrayClone(e,t);for(var o=0;t>o;++o)e[o].call(n,r,i,s)}}function emitMany(e,t,n,r){if(t)e.apply(n,r);else{t=e.length,e=arrayClone(e,t);for(var i=0;t>i;++i)e[i].apply(n,r)}}function listenerCount(e){var t=this._events;if(t){if(e=t[e],"function"==typeof e)return 1;if(e)return e.length}return 0}function spliceOne(e,t){for(var n=t,r=n+1,i=e.length;i>r;n+=1,r+=1)e[n]=e[r];e.pop()}function arrayClone(e,t){for(var n=Array(t);t--;)n[t]=e[t];return n}var domain;module.exports=EventEmitter,EventEmitter.EventEmitter=EventEmitter,EventEmitter.usingDomains=!1,EventEmitter.prototype.domain=void 0,EventEmitter.prototype._events=void 0,EventEmitter.prototype._maxListeners=void 0,EventEmitter.defaultMaxListeners=10,EventEmitter.init=function(){this.domain=null,EventEmitter.usingDomains&&(domain=domain||require("domain"),!domain.active||this instanceof domain.Domain||(this.domain=domain.active)),this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events={},this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},EventEmitter.prototype.setMaxListeners=function(e){if("number"!=typeof e||0>e||isNaN(e))throw new TypeError("n must be a positive number");return this._maxListeners=e,this},EventEmitter.prototype.getMaxListeners=function(){return $getMaxListeners(this)},EventEmitter.prototype.emit=function(e){var t,n,r,i,s,o;if(t=!1,r="error"===e,n=this._events)r=r&&null==n.error;else if(!r)return!1;if(o=this.domain,r){if(t=arguments[1],!o){if(t instanceof Error)throw t;throw o=Error('Uncaught, unspecified "error" event. ('+t+")"),o.context=t,o}return t||(t=Error('Uncaught, unspecified "error" event.')),t.domainEmitter=this,t.domain=o,t.domainThrown=!1,o.emit("error",t),!1}if(n=n[e],!n)return!1;o&&(o.enter(),t=!0);var a="function"==typeof n;switch(r=arguments.length){case 1:emitNone(n,a,this);break;case 2:emitOne(n,a,this,arguments[1]);break;case 3:emitTwo(n,a,this,arguments[1],arguments[2]);break;case 4:emitThree(n,a,this,arguments[1],arguments[2],arguments[3]);break;default:for(i=Array(r-1),s=1;r>s;s++)i[s-1]=arguments[s];emitMany(n,a,this,i)}return t&&o.exit(),!0},EventEmitter.prototype.addListener=function(e,t){var n,r;if("function"!=typeof t)throw new TypeError("listener must be a function");return(n=this._events)?(n.newListener&&(this.emit("newListener",e,t.listener?t.listener:t),n=this._events),r=n[e]):(n=this._events={},this._eventsCount=0),r?("function"==typeof r?r=n[e]=[r,t]:r.push(t),r.warned||(n=$getMaxListeners(this))&&n>0&&r.length>n&&(r.warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d %s listeners added. Use emitter.setMaxListeners() to increase limit.",r.length,e),console.trace())):(n[e]=t,++this._eventsCount),this},EventEmitter.prototype.on=EventEmitter.prototype.addListener,EventEmitter.prototype.once=function(e,t){function n(){this.removeListener(e,n),r||(r=!0,t.apply(this,arguments))}if("function"!=typeof t)throw new TypeError("listener must be a function");var r=!1;return n.listener=t,this.on(e,n),this},EventEmitter.prototype.removeListener=function(e,t){var n,r,i,s;if("function"!=typeof t)throw new TypeError("listener must be a function");if(r=this._events,!r)return this;if(n=r[e],!n)return this;if(n===t||n.listener&&n.listener===t)0===--this._eventsCount?this._events={}:(delete r[e],r.removeListener&&this.emit("removeListener",e,t));else if("function"!=typeof n){for(i=-1,s=n.length;0<s--;)if(n[s]===t||n[s].listener&&n[s].listener===t){i=s;break}if(0>i)return this;if(1===n.length){if(n[0]=void 0,0===--this._eventsCount)return this._events={},this;delete r[e]}else spliceOne(n,i);r.removeListener&&this.emit("removeListener",e,t)}return this},EventEmitter.prototype.removeAllListeners=function(e){var t;if(t=this._events,!t)return this;if(!t.removeListener)return 0===arguments.length?(this._events={},this._eventsCount=0):t[e]&&(0===--this._eventsCount?this._events={}:delete t[e]),this;if(0===arguments.length){t=Object.keys(t);for(var n,r=0;r<t.length;++r)n=t[r],"removeListener"!==n&&this.removeAllListeners(n);return this.removeAllListeners("removeListener"),this._events={},this._eventsCount=0,this}if(t=t[e],"function"==typeof t)this.removeListener(e,t);else if(t)do this.removeListener(e,t[t.length-1]);while(t[0]);return this},EventEmitter.prototype.listeners=function(e){var t=this._events;return e=t&&(e=t[e])?"function"==typeof e?[e]:arrayClone(e,e.length):[]},EventEmitter.listenerCount=function(e,t){return"function"==typeof e.listenerCount?e.listenerCount(t):listenerCount.call(e,t)},EventEmitter.prototype.listenerCount=listenerCount;

},{"domain":13}],17:[function(require,module,exports){
"use strict";function _toConsumableArray(e){if(Array.isArray(e)){for(var t=0,n=Array(e.length);t<e.length;t++)n[t]=e[t];return n}return Array.from(e)}function _possibleConstructorReturn(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function _inherits(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var _createClass=function(){function e(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}return function(t,n,i){return n&&e(t.prototype,n),i&&e(t,i),t}}(),events=require("./events.js"),msgpack=require("./msgpack.js"),sha256=require("./sha256.js"),TerminalLine=function(){function e(t){_classCallCheck(this,e),this.element=document.createElement("line"),this.setMessage(t)}return _createClass(e,[{key:"setMessage",value:function(e){this.element.innerHTML=e}},{key:"getElement",value:function(){return this.element}}]),e}(),TerminalCommandLine=function(){function e(){_classCallCheck(this,e),this.element=document.createElement("inputline"),this.prompt=document.createElement("prompt"),this.input=document.createElement("input"),this.input.className="command",this.element.appendChild(this.prompt),this.element.appendChild(this.input)}return _createClass(e,[{key:"setDisabled",value:function(e){this.input.setAttribute("disabled",e)}},{key:"setAutofocus",value:function(){this.input.setAttribute("autofocus",!0)}},{key:"setInput",value:function(e){this.input.value=e}},{key:"setPrompt",value:function(e){this.prompt.innerText=e}},{key:"getElement",value:function(){return this.element}}]),e}(),TerminalLineFeed=function(){function e(t){_classCallCheck(this,e),this.lineFeed=[],this.output=t}return _createClass(e,[{key:"push",value:function(e){this.output.appendChild(e.getElement()),this.lineFeed.push(e)}},{key:"remove",value:function(e){this.output.removeChild(e.getElement());var t=this.lineFeed.indexOf(e);~t&&(this.lineFeed=Array.prototype.concat.call(this.lineFeed.slice(0,t),this.lineFeed.slice(t+1,this.lineFeed.length-1)))}},{key:"removeAllLines",value:function(){var e=this;this.lineFeed.forEach(function(t){return e.remove(t)})}},{key:"removeLastPartial",value:function(){for(var e=this,t=void 0,n=this.lineFeed.length;n>=0;--n)if(this.lineFeed[n]instanceof TerminalCommandLine){t=this.lineFeed[n];break}void 0!==t&&this.lineFeed.slice(this.lineFeed.indexOf(t)).forEach(function(t){e.remove(t)})}}]),e}(),Terminal=function(e){function t(){_classCallCheck(this,t);var e=_possibleConstructorReturn(this,Object.getPrototypeOf(t).call(this));return e.init(),e.registerEvents(),e}return _inherits(t,e),_createClass(t,[{key:"init",value:function(){this.prefixMeta={name:"nobody",instance:"apx",uri:"~"},this.container=this._initContainer(),this.command=this.container.querySelector("inputline .command"),this.output=this.container.querySelector("output"),this.lineFeed=new TerminalLineFeed(this.output),this.commandFeed=[]}},{key:"_inputLine",value:function(){return new TerminalCommandLine}},{key:"_getPromptPrefix",value:function(){return this.prefixMeta.name+"@"+this.prefixMeta.instance+":"+this.prefixMeta.uri+"$"}},{key:"_commitPromptPrefix",value:function(){var e=this._getPromptPrefix();this.inputLine.setPrompt(e)}},{key:"_initContainer",value:function(){var e=document.createElement("cream");return e.className="box",this.output=document.createElement("output"),this.inputLine=this._inputLine(),this.inputLine.setAutofocus(!0),this._commitPromptPrefix(),document.body.appendChild(e),e.appendChild(this.output),e.appendChild(this.inputLine.getElement()),e}},{key:"registerEvents",value:function(){var e=this;this.command.addEventListener("keydown",function(t){if(t.metaKey)switch(t.preventDefault(),t.keyCode){case 75:return e.clearTerminal();case 76:return e.partialClearTerminal()}if(13===t.keyCode){switch(e.command.value){case"clear":return e.resetTerminal()}e.disableTerminal(),e.emit("command",e.command.value)}},!0)}},{key:"write",value:function(e){var t=new TerminalCommandLine;t.setDisabled(!0),t.setInput(this.command.value),t.setPrompt(this._getPromptPrefix()),this.lineFeed.push(t),this.writeRaw(e)}},{key:"writeRaw",value:function(e){var t=this;e=e.split("\n").map(function(e){return e.trim()}),e=e.map(function(e){return new TerminalLine(e)}),e.forEach(function(e){return t.lineFeed.push(e)})}},{key:"commit",value:function(){this.command.value="",this.command.disabled=!1,this.command.focus(),this.command.scrollIntoView()}},{key:"clearTerminal",value:function(){this.lineFeed.removeAllLines()}},{key:"partialClearTerminal",value:function(){this.lineFeed.removeLastPartial()}},{key:"resetTerminal",value:function(){this.clearTerminal(),this.command.value=""}},{key:"disableTerminal",value:function(){this.command.disabled=!0}},{key:"destroy",value:function(){this.off(),this.clearTerminal(),document.body.removeChild(this.container)}}]),t}(events),apx=function(e){function t(){_classCallCheck(this,t);var e=_possibleConstructorReturn(this,Object.getPrototypeOf(t).call(this));return e.helpers={bsd16:function(e){for(var t=0,n=0,i=e.length;i>n;n++)t=((t>>>1)+((1&t)<<15)|0)+(255&e[n])&65535|0;return t},arr2uint8:function(e){for(var t=0,n=new Uint8Array(e.length);t<e.length;++t)n[t]=e[t];return n}},e.registerRealtime(),e.setupTTY(),e.reactiveKeychain(),e}return _inherits(t,e),_createClass(t,[{key:"setupTTY",value:function(){this.initTerminal(),this.initKeychain(),localStorage.id&&this.handshake()}},{key:"reset",value:function(){}},{key:"initKeychain",value:function(){this.alice={},this.alice.keypair=sodium.crypto_box_keypair(),this.alice.nonce=sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);var e=String(location.hash.slice(1));if(""===e)throw this.terminal.writeRaw("Bad secret"),this.terminal.disableTerminal(),new Error;e=sha256(e),this.alice.secretHash=e,this.alice.authedHandshake=sodium.crypto_auth(this.alice.nonce,e)}},{key:"reactiveKeychain",value:function(){var e=this;window.addEventListener("hashchange",function(){e.terminal.destroy(),e.terminal=null,setTimeout(function(){return e.setupTTY()})})}},{key:"registerRealtime",value:function(){var e=this;this.io=io({path:"/io"});var t=function(t){e.terminal.write(t),e.terminal.commit()};this.io.on("err",t),this.io.on("info",t),this.io.on("post-auth",function(t,n){sodium.crypto_auth_verify(Uint8Array.from(n),e.bob.nonce,e.alice.secretHash)&&(e.authenticated=!0,e.terminal.write("Welcome, "+t+"."),e.terminal.commit())}),this.io.on("rpc",function(t){return e.handleRPC(t)})}},{key:"handleRPC",value:function(e){try{switch(e=msgpack.decode(new Uint8Array(e)),e.type){case"handshake":return this.digestHandshake(e.publicKey,e.nonce)}}catch(t){console.warn("Received invalid RPC frame.",t.stack)}}},{key:"digestHandshake",value:function(e,t){this.bob={publicKey:this.helpers.arr2uint8(e),nonce:this.helpers.arr2uint8(t)};var n=sodium.crypto_box_easy("init",this.alice.nonce,this.bob.publicKey,this.alice.keypair.privateKey);this.io.emit("post-handshake",[].concat(_toConsumableArray(n)))}},{key:"handshake",value:function(){var e=localStorage.id,t={user:e,nonce:[].concat(_toConsumableArray(this.alice.nonce)),publicKey:[].concat(_toConsumableArray(this.alice.keypair.publicKey)),authedHandshake:[].concat(_toConsumableArray(this.alice.authedHandshake))},n=String.fromCharCode.apply(null,msgpack.encode(t)),i=this.helpers.bsd16(n);this.io.emit("handshake",n,i)}},{key:"bufcmp",value:function(e,t){if(e.length!==t.length)return!1;for(var n=0;n<t.length;++n)if(e[n]!==t[n])return!1;return!0}},{key:"initTerminal",value:function(){var e=this;this.terminal=new Terminal,this.terminal.on("command",function(t){var n=t.trim().split(" ");e.authenticated?e.io.emit("command",n):2!==n.length||"login"!==n[0]?(e.terminal.write("Not authenticated."),e.terminal.commit()):(localStorage.id=n[1],e.handshake())})}}]),t}(events);new apx;

},{"./events.js":16,"./msgpack.js":18,"./sha256.js":19}],18:[function(require,module,exports){
"use strict";function _typeof(t){return t&&"undefined"!=typeof Symbol&&t.constructor===Symbol?"symbol":typeof t}function Decoder(t,e){this.offset=e||0,this.buffer=t}function decode(t){var e=new Decoder(t),r=e.parse();if(e.offset!==t.length)throw new Error(t.length-e.offset+" trailing bytes");return r}function encodeableKeys(t){return Object.keys(t).filter(function(e){return"function"!=typeof t[e]||t[e].toJSON})}function encode(t,e,r){var s,f,o="undefined"==typeof t?"undefined":_typeof(t);if("string"===o){if(t=bops.from(t),s=t.length,32>s)return e[r]=160|s,bops.copy(t,e,r+1),1+s;if(256>s)return e[r]=217,bops.writeUInt8(e,s,r+1),bops.copy(t,e,r+2),2+s;if(65536>s)return e[r]=218,bops.writeUInt16BE(e,s,r+1),bops.copy(t,e,r+3),3+s;if(4294967296>s)return e[r]=219,bops.writeUInt32BE(e,s,r+1),bops.copy(t,e,r+5),5+s}if(bops.is(t)){if(s=t.length,256>s)return e[r]=196,bops.writeUInt8(e,s,r+1),bops.copy(t,e,r+2),2+s;if(65536>s)return e[r]=216,bops.writeUInt16BE(e,s,r+1),bops.copy(t,e,r+3),3+s;if(4294967296>s)return e[r]=217,bops.writeUInt32BE(e,s,r+1),bops.copy(t,e,r+5),5+s}if("number"===o){if(t<<0!==t)return e[r]=203,bops.writeDoubleBE(e,t,r+1),9;if(t>=0){if(128>t)return e[r]=t,1;if(256>t)return e[r]=204,e[r+1]=t,2;if(65536>t)return e[r]=205,bops.writeUInt16BE(e,t,r+1),3;if(4294967296>t)return e[r]=206,bops.writeUInt32BE(e,t,r+1),5;if(0x10000000000000000>t)return e[r]=207,bops.writeUInt64BE(e,t,r+1),9;throw new Error("Number too big 0x"+t.toString(16))}if(t>=-32)return bops.writeInt8(e,t,r),1;if(t>=-128)return e[r]=208,bops.writeInt8(e,t,r+1),2;if(t>=-32768)return e[r]=209,bops.writeInt16BE(e,t,r+1),3;if(t>=-2147483648)return e[r]=210,bops.writeInt32BE(e,t,r+1),5;if(t>=-0x8000000000000000)return e[r]=211,bops.writeInt64BE(e,t,r+1),9;throw new Error("Number too small -0x"+t.toString(16).substr(1))}if("undefined"===o)return e[r]=212,e[r+1]=0,e[r+2]=0,1;if(null===t)return e[r]=192,1;if("boolean"===o)return e[r]=t?195:194,1;if("function"==typeof t.toJSON)return encode(t.toJSON(),e,r);if("object"===o){f=0;var i=Array.isArray(t);if(i)s=t.length;else{var n=encodeableKeys(t);s=n.length}if(16>s?(e[r]=s|(i?144:128),f=1):65536>s?(e[r]=i?220:222,bops.writeUInt16BE(e,s,r+1),f=3):4294967296>s&&(e[r]=i?221:223,bops.writeUInt32BE(e,s,r+1),f=5),i)for(var u=0;s>u;u++)f+=encode(t[u],e,r+f);else for(var u=0;s>u;u++){var h=n[u];f+=encode(h,e,r+f),f+=encode(t[h],e,r+f)}return f}if("function"!==o)throw new Error("Unknown type "+o)}function sizeof(t){var e,r,s="undefined"==typeof t?"undefined":_typeof(t);if("string"===s){if(e=bops.from(t).length,32>e)return 1+e;if(256>e)return 2+e;if(65536>e)return 3+e;if(4294967296>e)return 5+e}if(bops.is(t)){if(e=t.length,256>e)return 2+e;if(65536>e)return 3+e;if(4294967296>e)return 5+e}if("number"===s){if(t<<0!==t)return 9;if(t>=0){if(128>t)return 1;if(256>t)return 2;if(65536>t)return 3;if(4294967296>t)return 5;if(0x10000000000000000>t)return 9;throw new Error("Number too big 0x"+t.toString(16))}if(t>=-32)return 1;if(t>=-128)return 2;if(t>=-32768)return 3;if(t>=-2147483648)return 5;if(t>=-0x8000000000000000)return 9;throw new Error("Number too small -0x"+t.toString(16).substr(1))}if("boolean"===s||null===t)return 1;if("undefined"===s)return 3;if("function"==typeof t.toJSON)return sizeof(t.toJSON());if("object"===s){if("function"==typeof t.toJSON&&(t=t.toJSON()),r=0,Array.isArray(t)){e=t.length;for(var f=0;e>f;f++)r+=sizeof(t[f])}else{var o=encodeableKeys(t);e=o.length;for(var f=0;e>f;f++){var i=o[f];r+=sizeof(i)+sizeof(t[i])}}if(16>e)return 1+r;if(65536>e)return 3+r;if(4294967296>e)return 5+r;throw new Error("Array or object too long 0x"+e.toString(16))}if("function"===s)return 0;throw new Error("Unknown type "+s)}var bops=require("bops");exports.encode=function(t){var e=sizeof(t);if(0!==e){var r=bops.create(e);return encode(t,r,0),r}},exports.decode=decode,Decoder.prototype.map=function(t){for(var e={},r=0;t>r;r++){var s=this.parse();e[s]=this.parse()}return e},Decoder.prototype.bin=function(t){var e=bops.subarray(this.buffer,this.offset,this.offset+t);return this.offset+=t,e},Decoder.prototype.str=function(t){var e=bops.to(bops.subarray(this.buffer,this.offset,this.offset+t));return this.offset+=t,e},Decoder.prototype.array=function(t){for(var e=new Array(t),r=0;t>r;r++)e[r]=this.parse();return e},Decoder.prototype.parse=function(){var t,e,r,s=this.buffer[this.offset];if(0===(128&s))return this.offset++,s;if(128===(240&s))return e=15&s,this.offset++,this.map(e);if(144===(240&s))return e=15&s,this.offset++,this.array(e);if(160===(224&s))return e=31&s,this.offset++,this.str(e);if(224===(224&s))return t=bops.readInt8(this.buffer,this.offset),this.offset++,t;switch(s){case 192:return this.offset++,null;case 194:return this.offset++,!1;case 195:return this.offset++,!0;case 196:return e=bops.readUInt8(this.buffer,this.offset+1),this.offset+=2,this.bin(e);case 197:return e=bops.readUInt16BE(this.buffer,this.offset+1),this.offset+=3,this.bin(e);case 198:return e=bops.readUInt32BE(this.buffer,this.offset+1),this.offset+=5,this.bin(e);case 199:return e=bops.readUInt8(this.buffer,this.offset+1),r=bops.readUInt8(this.buffer,this.offset+2),this.offset+=3,[r,this.bin(e)];case 200:return e=bops.readUInt16BE(this.buffer,this.offset+1),r=bops.readUInt8(this.buffer,this.offset+3),this.offset+=4,[r,this.bin(e)];case 201:return e=bops.readUInt32BE(this.buffer,this.offset+1),r=bops.readUInt8(this.buffer,this.offset+5),this.offset+=6,[r,this.bin(e)];case 202:return t=bops.readFloatBE(this.buffer,this.offset+1),this.offset+=5,t;case 203:return t=bops.readDoubleBE(this.buffer,this.offset+1),this.offset+=9,t;case 204:return t=this.buffer[this.offset+1],this.offset+=2,t;case 205:return t=bops.readUInt16BE(this.buffer,this.offset+1),this.offset+=3,t;case 206:return t=bops.readUInt32BE(this.buffer,this.offset+1),this.offset+=5,t;case 207:return t=bops.readUInt64BE(this.buffer,this.offset+1),this.offset+=9,t;case 208:return t=bops.readInt8(this.buffer,this.offset+1),this.offset+=2,t;case 209:return t=bops.readInt16BE(this.buffer,this.offset+1),this.offset+=3,t;case 210:return t=bops.readInt32BE(this.buffer,this.offset+1),this.offset+=5,t;case 211:return t=bops.readInt64BE(this.buffer,this.offset+1),this.offset+=9,t;case 212:return r=bops.readUInt8(this.buffer,this.offset+1),t=bops.readUInt8(this.buffer,this.offset+2),this.offset+=3,0===r&&0===t?void 0:[r,t];case 213:return r=bops.readUInt8(this.buffer,this.offset+1),this.offset+=2,[r,this.bin(2)];case 214:return r=bops.readUInt8(this.buffer,this.offset+1),this.offset+=2,[r,this.bin(4)];case 215:return r=bops.readUInt8(this.buffer,this.offset+1),this.offset+=2,[r,this.bin(8)];case 216:return r=bops.readUInt8(this.buffer,this.offset+1),this.offset+=2,[r,this.bin(16)];case 217:return e=bops.readUInt8(this.buffer,this.offset+1),this.offset+=2,this.str(e);case 218:return e=bops.readUInt16BE(this.buffer,this.offset+1),this.offset+=3,this.str(e);case 219:return e=bops.readUInt32BE(this.buffer,this.offset+1),this.offset+=5,this.str(e);case 220:return e=bops.readUInt16BE(this.buffer,this.offset+1),this.offset+=3,this.array(e);case 221:return e=bops.readUInt32BE(this.buffer,this.offset+1),this.offset+=5,this.array(e);case 222:return e=bops.readUInt16BE(this.buffer,this.offset+1),this.offset+=3,this.map(e);case 223:return e=bops.readUInt32BE(this.buffer,this.offset+1),this.offset+=5,this.map(e);case 216:return e=bops.readUInt16BE(this.buffer,this.offset+1),this.offset+=3,this.buf(e);case 217:return e=bops.readUInt32BE(this.buffer,this.offset+1),this.offset+=5,this.buf(e)}throw new Error("Unknown type 0x"+s.toString(16))};

},{"bops":1}],19:[function(require,module,exports){
"use strict";var EXTRA=[-2147483648,8388608,32768,128],SHIFT=[24,16,8,0],K=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298],blocks=[];module.exports=function(o){var c="string"!=typeof o;c&&o.constructor==ArrayBuffer&&(o=new Uint8Array(o));var s,l,b,k,r,e,t,T,F,H,I,S,a,n,f,i,A,u,v,d,h,y,w=!0,g=!1,p=0,C=0,E=0,R=o.length;s=1779033703,l=3144134277,b=1013904242,k=2773480762,r=1359893119,e=2600822924,t=528734635,T=1541459225,F=0;do{if(blocks[0]=F,blocks[16]=blocks[1]=blocks[2]=blocks[3]=blocks[4]=blocks[5]=blocks[6]=blocks[7]=blocks[8]=blocks[9]=blocks[10]=blocks[11]=blocks[12]=blocks[13]=blocks[14]=blocks[15]=0,c)for(I=C;R>p&&64>I;++p)blocks[I>>2]|=o[p]<<SHIFT[3&I++];else for(I=C;R>p&&64>I;++p)H=o.charCodeAt(p),128>H?blocks[I>>2]|=H<<SHIFT[3&I++]:2048>H?(blocks[I>>2]|=(192|H>>6)<<SHIFT[3&I++],blocks[I>>2]|=(128|63&H)<<SHIFT[3&I++]):55296>H||H>=57344?(blocks[I>>2]|=(224|H>>12)<<SHIFT[3&I++],blocks[I>>2]|=(128|H>>6&63)<<SHIFT[3&I++],blocks[I>>2]|=(128|63&H)<<SHIFT[3&I++]):(H=65536+((1023&H)<<10|1023&o.charCodeAt(++p)),blocks[I>>2]|=(240|H>>18)<<SHIFT[3&I++],blocks[I>>2]|=(128|H>>12&63)<<SHIFT[3&I++],blocks[I>>2]|=(128|H>>6&63)<<SHIFT[3&I++],blocks[I>>2]|=(128|63&H)<<SHIFT[3&I++]);E+=I-C,C=I-64,p==R&&(blocks[I>>2]|=EXTRA[3&I],++p),F=blocks[16],p>R&&56>I&&(blocks[15]=E<<3,g=!0);var U=s,X=l,m=b,x=k,B=r,j=e,q=t,z=T;for(S=16;64>S;++S)i=blocks[S-15],a=(i>>>7|i<<25)^(i>>>18|i<<14)^i>>>3,i=blocks[S-2],n=(i>>>17|i<<15)^(i>>>19|i<<13)^i>>>10,blocks[S]=blocks[S-16]+a+blocks[S-7]+n<<0;for(y=X&m,S=0;64>S;S+=4)w?(v=704751109,i=blocks[0]-210244248,z=i-1521486534<<0,x=i+143694565<<0,w=!1):(a=(U>>>2|U<<30)^(U>>>13|U<<19)^(U>>>22|U<<10),n=(B>>>6|B<<26)^(B>>>11|B<<21)^(B>>>25|B<<7),v=U&X,f=v^U&m^y,u=B&j^~B&q,i=z+n+u+K[S]+blocks[S],A=a+f,z=x+i<<0,x=i+A<<0),a=(x>>>2|x<<30)^(x>>>13|x<<19)^(x>>>22|x<<10),n=(z>>>6|z<<26)^(z>>>11|z<<21)^(z>>>25|z<<7),d=x&U,f=d^x&X^v,u=z&B^~z&j,i=q+n+u+K[S+1]+blocks[S+1],A=a+f,q=m+i<<0,m=i+A<<0,a=(m>>>2|m<<30)^(m>>>13|m<<19)^(m>>>22|m<<10),n=(q>>>6|q<<26)^(q>>>11|q<<21)^(q>>>25|q<<7),h=m&x,f=h^m&U^d,u=q&z^~q&B,i=j+n+u+K[S+2]+blocks[S+2],A=a+f,j=X+i<<0,X=i+A<<0,a=(X>>>2|X<<30)^(X>>>13|X<<19)^(X>>>22|X<<10),n=(j>>>6|j<<26)^(j>>>11|j<<21)^(j>>>25|j<<7),y=X&m,f=y^X&x^h,u=j&q^~j&z,i=B+n+u+K[S+3]+blocks[S+3],A=a+f,B=U+i<<0,U=i+A<<0;s=s+U<<0,l=l+X<<0,b=b+m<<0,k=k+x<<0,r=r+B<<0,e=e+j<<0,t=t+q<<0,T=T+z<<0}while(!g);var D=new Uint8Array(32);return D[0]=s>>24&255,D[1]=s>>16&255,D[2]=s>>8&255,D[3]=255&s,D[4]=l>>24&255,D[5]=l>>16&255,D[6]=l>>8&255,D[7]=255&l,D[8]=b>>24&255,D[9]=b>>16&255,D[10]=b>>8&255,D[11]=255&b,D[12]=k>>24&255,D[13]=k>>16&255,D[14]=k>>8&255,D[15]=255&k,D[16]=r>>24&255,D[17]=r>>16&255,D[18]=r>>8&255,D[19]=255&r,D[20]=e>>24&255,D[21]=e>>16&255,D[22]=e>>8&255,D[23]=255&e,D[24]=t>>24&255,D[25]=t>>16&255,D[26]=t>>8&255,D[27]=255&t,D[28]=T>>24&255,D[29]=T>>16&255,D[30]=T>>8&255,D[31]=255&T,D};

},{}]},{},[17]);
