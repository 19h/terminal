(function outer(modules, cache, entries){

  /**
   * Global
   */

  var global = (function(){ return this; })();

  /**
   * Require `name`.
   *
   * @param {String} name
   * @api public
   */

  function require(name){
    if (cache[name]) return cache[name].exports;
    if (modules[name]) return call(name, require);
    throw new Error('cannot find module "' + name + '"');
  }

  /**
   * Call module `id` and cache it.
   *
   * @param {Number} id
   * @param {Function} require
   * @return {Function}
   * @api private
   */

  function call(id, require){
    var m = cache[id] = { exports: {} };
    var mod = modules[id];
    var name = mod[2];
    var fn = mod[0];
    var threw = true;

    try {
      fn.call(m.exports, function(req){
        var dep = modules[id][1][req];
        return require(dep || req);
      }, m, m.exports, outer, modules, cache, entries);
      threw = false;
    } finally {
      if (threw) {
        delete cache[id];
      } else if (name) {
        // expose as 'name'.
        cache[name] = cache[id];
      }
    }

    return cache[id].exports;
  }

  /**
   * Require all entries exposing them on global if needed.
   */

  for (var id in entries) {
    if (entries[id]) {
      global[entries[id]] = require(id);
    } else {
      require(id);
    }
  }

  /**
   * Duo flag.
   */

  require.duo = true;

  /**
   * Expose cache.
   */

  require.cache = cache;

  /**
   * Expose modules
   */

  require.modules = modules;

  /**
   * Return newest require.
   */

   return require;
})({
1: [function(require, module, exports) {
'use strict';

let events = require('./events.js');

let msgpack = require('./msgpack.min.js');
let sha256 = require('./sha256.js');

class TerminalLine {
	constructor (message) {
		this.element = document.createElement('line');

		this.setMessage(message);
	}

	setMessage (message) {
		this.element.innerHTML = message;
	}

	getElement () {
		return this.element;
	}
};

class TerminalCommandLine {
	constructor () {
		this.element = document.createElement('inputline');
		this.prompt = document.createElement('prompt');
		this.input = document.createElement('input');

		this.input.className = 'command';

		this.element.appendChild(this.prompt);
		this.element.appendChild(this.input);
	}

	setDisabled (disabled) {
		this.input.setAttribute('disabled', disabled);
	}

	setAutofocus () {
		this.input.setAttribute('autofocus', true);
	}

	setInput (message) {
		this.input.value = message;
	}

	setPrompt (prompt) {
		this.prompt.innerText = prompt;
	}

	getElement () {
		return this.element;
	}
};

class TerminalLineFeed {
	constructor (output) {
		this.lineFeed = [];
		this.output = output;
	}

	push (line) {
		this.output.appendChild(line.getElement());
		this.lineFeed.push(line);
	}

	remove (line) {
		this.output.removeChild(line.getElement());

		let itemPos = this.lineFeed.indexOf(line);

		if (~itemPos) {
			this.lineFeed = Array.prototype.concat.call(
				this.lineFeed.slice(0, itemPos),
				this.lineFeed.slice(itemPos + 1, this.lineFeed.length - 1)
			);
		}
	}

	removeAllLines () {
		this.lineFeed.forEach((line) => this.remove(line));
	}

	removeLastPartial () {
		let lastCommandLine;

		for (let i = this.lineFeed.length; i >= 0; --i) {
			if (this.lineFeed[i] instanceof TerminalCommandLine) {
				lastCommandLine = this.lineFeed[i];
				break;
			}
		}

		if (lastCommandLine === undefined) return;

		this.lineFeed.slice(this.lineFeed.indexOf(lastCommandLine)).forEach((line) => {
			this.remove(line);
		})
	}
}

class Terminal extends events {
	constructor () {
		super();

		this.init();

		this.registerEvents();
	}

	init () {
		this.prefixMeta = {
			name: 'nobody',
			instance: 'apx',
			uri: '~'
		};

		this.container = this._initContainer();

		this.command = this.container.querySelector('inputline .command');
		this.output = this.container.querySelector('output');

		this.lineFeed = new TerminalLineFeed(this.output);
		this.commandFeed = [];
	}

	_inputLine (readOnly) {
		return new TerminalCommandLine ();
	}

	_getPromptPrefix () {
		return this.prefixMeta.name
			   + '@' + this.prefixMeta.instance
			   + ':' + this.prefixMeta.uri + '$';
	}
	_commitPromptPrefix () {
		let promptPrefix = this._getPromptPrefix();

		this.inputLine.setPrompt(promptPrefix);
	}

	_initContainer () {
		let container = document.createElement('cream');
		container.className = 'box';

		this.output = document.createElement('output');

		this.inputLine = this._inputLine();
		this.inputLine.setAutofocus(true);

		this._commitPromptPrefix();

		document.body.appendChild(container);

		container.appendChild(this.output);
		container.appendChild(this.inputLine.getElement());

		return container;
	}

	registerEvents() {
		this.command.addEventListener('keydown', (e) => {
			if (e.metaKey) {
				e.preventDefault();

				switch (e.keyCode) {
					case 75: return this.clearTerminal();
					case 76: return this.partialClearTerminal();
				}
			}

			if (e.keyCode === 13) {
				// jump list
				switch (this.command.value) {
					case 'clear':
						return this.resetTerminal();
				}

				this.disableTerminal();
				this.emit('command', this.command.value);
			}
		}, true);
	}

	// write partial message, non-exit
	write (msg) {
		let fakeInputLine = new TerminalCommandLine();

		fakeInputLine.setDisabled(true);
		fakeInputLine.setInput(this.command.value);
		fakeInputLine.setPrompt(this._getPromptPrefix());

		this.lineFeed.push(fakeInputLine);

		this.writeRaw(msg);
	}

	writeRaw (msg) {
		msg = msg.split('\n').map((line) => line.trim());
		msg = msg.map((line) => {
			return new TerminalLine(line);
		});

		msg.forEach((line) => {
			this.lineFeed.push(line);
		});
	}

	// quit command
	commit (msg) {
		this.command.value = '';
		this.command.disabled = false;

		this.command.focus();
		this.command.scrollIntoView();
	}

	// divers commands
	clearTerminal () {
		this.lineFeed.removeAllLines();
	}

	partialClearTerminal () {
		this.lineFeed.removeLastPartial();
	}

	resetTerminal () {
		this.clearTerminal();
		this.command.value = '';
	}

	disableTerminal () {
		this.command.disabled = true;
	}

	destroy () {
		// clear eventing
		this.off();

		// clear line references
		this.clearTerminal();

		// remove DOM elements
		document.body.removeChild(this.container);
	}
};

class apx extends events {
	constructor () {
		super();

		this.helpers = {
			bsd16: (arr) => {
				let c = 0,
					i = 0,
					l = arr.length;

				for (; i < l; i++) c = (((((c >>> 1) + ((c & 1) << 15)) | 0) + (arr[i] & 0xff)) & 0xffff) | 0;

				return c;
			},
			arr2uint8: (arr) => {
				let i = 0, u8 = new Uint8Array(arr.length);

				for(; i < arr.length; ++i) {
					u8[i] = arr[i];
				}

				return u8;
			}
		};

		this.registerRealtime();

		this.setupTTY();

		this.reactiveKeychain();
	}

	setupTTY () {
		this.initTerminal();
		this.initKeychain();

		if (localStorage.id) {
			this.handshake();
		}
	}

	reset () {
	}

	initKeychain () {
		this.privateKeyChain = {};

		this.privateKeyChain.keypair = sodium.crypto_box_keypair();
		this.privateKeyChain.nonce = sodium.randombytes_buf(24);

		let secret = String(location.hash.slice(1));

		if (secret === '') {
			this.terminal.writeRaw('Bad secret');
			this.terminal.disableTerminal();

			throw new Error();
		}

		secret = sha256(secret)

		this.privateKeyChain.authedHandshake = sodium.crypto_auth(this.privateKeyChain.nonce, secret);
	}

	reactiveKeychain () {
		window.addEventListener('hashchange', () => {
			this.terminal.destroy();
			this.terminal = null;

			setTimeout(() => {
				this.setupTTY();
			});
		})
	}

	registerRealtime () {
		this.io = io();

		this.io.on('err', (msg) => {
			this.terminal.write(msg);
			this.terminal.commit();
		});

		this.io.on('prefix', (prefix) => {

		});

		this.io.on('rpc', (data) => this.handleRPC(data));
	}

	handleRPC (data) {
		try {
			data = msgpack.unpack(new Uint8Array(data));

			switch (data.type) {
				case 'handshake':
					return this.digestHandshake(data.publicKey, data.nonce);
			}
		} catch(e) {
			console.warn('Received invalid RPC frame.', e.stack);
		}
	}

	digestHandshake (publicKey, nonce) {
		this.keyChain = {
			publicKey: this.helpers.arr2uint8(publicKey),
			nonce: this.helpers.arr2uint8(nonce)
		};


		sodium.crypto_box_easy(
			"test",
			this.keyChain.nonce,
			this.keyChain.publicKey,
			this.privateKeyChain.keypair.privateKey
		);


	}

	handshake () {
		let user = localStorage.id;

		let arr = (item) => Array.prototype.slice.call(item);

		let seed = {
			user: user,
			nonce: arr(this.privateKeyChain.nonce),
			publicKey: arr(this.privateKeyChain.keypair.publicKey),
			authedHandshake: arr(this.privateKeyChain.authedHandshake)
		};

		let packet = String.fromCharCode.apply(null, msgpack.pack(seed)),
		  checksum = this.helpers.bsd16(packet);

		this.io.emit('handshake', packet, checksum);
	}

	bufcmp (buf1, buf2) {
		if (buf1.length !== buf2.length) return false;

		for(let i = 0; i < buf2.length; ++i)
			if (buf1[i] !== buf2[i]) return false;

		return true;
	}

	initTerminal () {
		this.terminal = new Terminal();

		this.terminal.on('command', (msg) => {
			let _msg = msg.trim().split(' ');

			if (this.authenticated) {
			} else {
				if (_msg.length !== 2 || _msg[0] !== 'login') {
					this.terminal.write('Not authenticated.');
					this.terminal.commit();
				} else {
					localStorage.id = _msg[1];

					this.handshake();
				}
			}
		});
	}
};

new apx();

}, {"./events.js":2,"./msgpack.min.js":3,"./sha256.js":4}],
2: [function(require, module, exports) {
var domain;function EventEmitter(){EventEmitter.init.call(this)}module.exports=EventEmitter;EventEmitter.EventEmitter=EventEmitter;EventEmitter.usingDomains=!1;EventEmitter.prototype.domain=void 0;EventEmitter.prototype._events=void 0;EventEmitter.prototype._maxListeners=void 0;EventEmitter.defaultMaxListeners=10; EventEmitter.init=function(){this.domain=null;EventEmitter.usingDomains&&(domain=domain||require("domain"),!domain.active||this instanceof domain.Domain||(this.domain=domain.active));this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events={},this._eventsCount=0);this._maxListeners=this._maxListeners||void 0};EventEmitter.prototype.setMaxListeners=function(b){if("number"!==typeof b||0>b||isNaN(b))throw new TypeError("n must be a positive number");this._maxListeners=b;return this}; function $getMaxListeners(b){return void 0===b._maxListeners?EventEmitter.defaultMaxListeners:b._maxListeners}EventEmitter.prototype.getMaxListeners=function(){return $getMaxListeners(this)};function emitNone(b,a,c){if(a)b.call(c);else{a=b.length;b=arrayClone(b,a);for(var d=0;d<a;++d)b[d].call(c)}}function emitOne(b,a,c,d){if(a)b.call(c,d);else{a=b.length;b=arrayClone(b,a);for(var e=0;e<a;++e)b[e].call(c,d)}} function emitTwo(b,a,c,d,e){if(a)b.call(c,d,e);else{a=b.length;b=arrayClone(b,a);for(var f=0;f<a;++f)b[f].call(c,d,e)}}function emitThree(b,a,c,d,e,f){if(a)b.call(c,d,e,f);else{a=b.length;b=arrayClone(b,a);for(var g=0;g<a;++g)b[g].call(c,d,e,f)}}function emitMany(b,a,c,d){if(a)b.apply(c,d);else{a=b.length;b=arrayClone(b,a);for(var e=0;e<a;++e)b[e].apply(c,d)}} EventEmitter.prototype.emit=function(b){var a,c,d,e,f,g;a=!1;d="error"===b;if(c=this._events)d=d&&null==c.error;else if(!d)return!1;g=this.domain;if(d){a=arguments[1];if(g)a||(a=Error('Uncaught, unspecified "error" event.')),a.domainEmitter=this,a.domain=g,a.domainThrown=!1,g.emit("error",a);else{if(a instanceof Error)throw a;g=Error('Uncaught, unspecified "error" event. ('+a+")");g.context=a;throw g;}return!1}c=c[b];if(!c)return!1;g&&(g.enter(),a=!0);var h="function"===typeof c;d=arguments.length; switch(d){case 1:emitNone(c,h,this);break;case 2:emitOne(c,h,this,arguments[1]);break;case 3:emitTwo(c,h,this,arguments[1],arguments[2]);break;case 4:emitThree(c,h,this,arguments[1],arguments[2],arguments[3]);break;default:e=Array(d-1);for(f=1;f<d;f++)e[f-1]=arguments[f];emitMany(c,h,this,e)}a&&g.exit();return!0}; EventEmitter.prototype.addListener=function(b,a){var c,d;if("function"!==typeof a)throw new TypeError("listener must be a function");(c=this._events)?(c.newListener&&(this.emit("newListener",b,a.listener?a.listener:a),c=this._events),d=c[b]):(c=this._events={},this._eventsCount=0);d?("function"===typeof d?d=c[b]=[d,a]:d.push(a),d.warned||(c=$getMaxListeners(this))&&0<c&&d.length>c&&(d.warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d %s listeners added. Use emitter.setMaxListeners() to increase limit.", d.length,b),console.trace())):(c[b]=a,++this._eventsCount);return this};EventEmitter.prototype.on=EventEmitter.prototype.addListener;EventEmitter.prototype.once=function(b,a){function c(){this.removeListener(b,c);d||(d=!0,a.apply(this,arguments))}if("function"!==typeof a)throw new TypeError("listener must be a function");var d=!1;c.listener=a;this.on(b,c);return this}; EventEmitter.prototype.removeListener=function(b,a){var c,d,e,f;if("function"!==typeof a)throw new TypeError("listener must be a function");d=this._events;if(!d)return this;c=d[b];if(!c)return this;if(c===a||c.listener&&c.listener===a)0===--this._eventsCount?this._events={}:(delete d[b],d.removeListener&&this.emit("removeListener",b,a));else if("function"!==typeof c){e=-1;for(f=c.length;0<f--;)if(c[f]===a||c[f].listener&&c[f].listener===a){e=f;break}if(0>e)return this;if(1===c.length){c[0]=void 0; if(0===--this._eventsCount)return this._events={},this;delete d[b]}else spliceOne(c,e);d.removeListener&&this.emit("removeListener",b,a)}return this}; EventEmitter.prototype.removeAllListeners=function(b){var a;a=this._events;if(!a)return this;if(!a.removeListener)return 0===arguments.length?(this._events={},this._eventsCount=0):a[b]&&(0===--this._eventsCount?this._events={}:delete a[b]),this;if(0===arguments.length){a=Object.keys(a);for(var c=0,d;c<a.length;++c)d=a[c],"removeListener"!==d&&this.removeAllListeners(d);this.removeAllListeners("removeListener");this._events={};this._eventsCount=0;return this}a=a[b];if("function"===typeof a)this.removeListener(b, a);else if(a){do this.removeListener(b,a[a.length-1]);while(a[0])}return this};EventEmitter.prototype.listeners=function(b){var a=this._events;b=a?(b=a[b])?"function"===typeof b?[b]:arrayClone(b,b.length):[]:[];return b};EventEmitter.listenerCount=function(b,a){return"function"===typeof b.listenerCount?b.listenerCount(a):listenerCount.call(b,a)};EventEmitter.prototype.listenerCount=listenerCount; function listenerCount(b){var a=this._events;if(a){b=a[b];if("function"===typeof b)return 1;if(b)return b.length}return 0}function spliceOne(b,a){for(var c=a,d=c+1,e=b.length;d<e;c+=1,d+=1)b[c]=b[d];b.pop()}function arrayClone(b,a){for(var c=Array(a);a--;)c[a]=b[a];return c}
}, {}],
3: [function(require, module, exports) {
(function(){function n(b){return k([],b)}function u(b){return{data:"string"===typeof b?w(b):b,index:-1,decode:y}.decode()}function k(b,a){var c=0,d=0,e,h;e=0;if(null==a)b.push(192);else switch(typeof a){case "boolean":b.push(a?195:194);break;case "number":a!==a?b.push(203,255,255,255,255,255,255,255,255):Infinity===a?b.push(203,127,240,0,0,0,0,0,0):Math.floor(a)===a?(0>a?-32<=a?b.push(224+a+32):-128<a?b.push(208,a+256):-32768<a?(a+=65536,b.push(209,a>>8,a&255)):-2147483648<a?(a+=4294967296,b.push(210,
a>>>24,a>>16&255,a>>8&255,a&255)):++e:128>a?b.push(a):256>a?b.push(204,a):65536>a?b.push(205,a>>8,a&255):4294967296>a?b.push(206,a>>>24,a>>16&255,a>>8&255,a&255):++e,e&&(d=Math.floor(a/4294967296),c=a&4294967295,b.push(0>a?211:207,d>>24&255,d>>16&255,d>>8&255,d&255,c>>24&255,c>>16&255,c>>8&255,c&255))):(d=r,(c=0>a)&&(a*=-1),e=Math.log(a)/Math.LN2+1023|0,h=Math.floor(a*Math.pow(2,1075-e)).toString(2).slice(1),e=("000000000"+e.toString(2)).slice(-11),c=(+c+e+h).match(z),b.push(203,d[c[0]],d[c[1]],d[c[2]],
d[c[3]],d[c[4]],d[c[5]],d[c[6]],d[c[7]]));break;case "string":c=[];e=a.length;for(d=0;d<e;++d)h=a.charCodeAt(d),128>h?c.push(h&127):2048>h?c.push(h>>>6&31|192,h&63|128):65536>h&&c.push(h>>>12&15|224,h>>>6&63|128,h&63|128);p(b,32,c.length,[160,218,219]);Array.prototype.push.apply(b,c);break;default:if("[object Array]"===Object.prototype.toString.call(a))for(c=a.length,p(b,16,c,[144,220,221]);d<c;++d)k(b,a[d]);else{if(Object.keys)c=Object.keys(a).length;else for(d in a)a.hasOwnProperty(d)&&++c;p(b,
16,c,[128,222,223]);for(d in a)k(b,d),k(b,a[d])}}return b}function y(){var b,a,c=0,d=0,e,d=this.data;e=d[++this.index];if(224<=e)return e-256;if(128>e)return e;144>e?(a=e-128,e=128):160>e?(a=e-144,e=144):192>e&&(a=e-160,e=160);switch(e){case 192:return null;case 194:return!1;case 195:return!0;case 202:return b=f(this,4),c=b&l[32],a=b>>23&255,d=b&8388607,b&&2147483648!==b?255===a?d?NaN:Infinity:(c?-1:1)*(d|8388608)*Math.pow(2,a-127-23):0;case 203:return b=f(this,4),c=b&l[32],a=b>>20&2047,d=b&1048575,
b&&2147483648!==b?2047===a?(f(this,4),d?NaN:Infinity):(c?-1:1)*((d|1048576)*Math.pow(2,a-1023-20)+f(this,4)*Math.pow(2,a-1023-52)):0;case 207:return f(this,4)*Math.pow(2,32)+f(this,4);case 206:return f(this,4);case 205:return f(this,2);case 204:return f(this,1);case 211:return b=0,c=this.data.slice(this.index+1,this.index+9),this.index+=8,c[0]&128&&(++b,c[0]^=255,c[1]^=255,c[2]^=255,c[3]^=255,c[4]^=255,c[5]^=255,c[6]^=255,c[7]^=255),c=72057594037927936*c[0]+281474976710656*c[1]+1099511627776*c[2]+
4294967296*c[3]+16777216*c[4]+65536*c[5]+256*c[6]+c[7],b?-1*(c+1):c;case 210:b=f(this,4);case 209:void 0===b&&(b=f(this,2));case 208:return void 0===b&&(b=f(this,1)),d=4<<(e&3)+1,b<l[d]?b:b-2*l[d];case 219:a=f(this,4);case 218:void 0===a&&(a=f(this,2));case 160:c=this.index+1;this.index+=a;b=[];ri=-1;for(a=c+a;c<a;++c)e=d[c],128>e?b[++ri]=e:224>e?b[++ri]=(e&31)<<6|d[++c]&63:240>e&&(b[++ri]=(e&15)<<12|(d[++c]&63)<<6|d[++c]&63);return String.fromCharCode.apply(null,b);case 223:a=f(this,4);case 222:void 0===
a&&(a=f(this,2));case 128:for(b={};c<a;++c)d=this.decode(),b[d]=this.decode();break;case 221:a=f(this,4);case 220:void 0===a&&(a=f(this,2));case 144:for(b=[];c<a;++c)b.push(this.decode())}return b}function f(b,a){var c=0,d=b.data,e=b.index;switch(a){case 4:c+=16777216*d[++e]+(d[++e]<<16);case 2:c+=d[++e]<<8;case 1:c+=d[++e]}b.index=e;return c}function p(b,a,c,d){c<a?b.push(d[0]+c):65536>c?b.push(d[1],c>>8,c&255):4294967296>c&&b.push(d[2],c>>>24,c>>16&255,c>>8&255,c&255)}function q(b,a,c){function d(){if(4===
g.readyState){var b,d=g.status,e={status:d,ok:200<=d&&300>d};if(!q++){if("PUT"===k)b=e.ok?g.responseText:"";else if(e.ok){if(a.worker&&"undefined"!==typeof Worker){b=new Worker(msgpack.worker);b.onmessage=function(b){c(b.data,a,e)};b.postMessage({method:"unpack",data:g.responseText});h();return}b=w(g.responseText);b=u(b)}t&&t(g,a,e);c(b,a,e);h()}}}function e(b,d){if(!q++){var e={status:d||400,ok:!1};t&&t(g,a,e);c(null,a,e);h(b)}}function h(a){a&&g&&g.abort&&g.abort();f&&(clearTimeout(f),f=0);g=null;
"undefined"!==typeof addEventListener&&removeEventListener("beforeunload",e,!1)}var f=0,k=a.method||"GET",l=a.header||{},n=a.before,t=a.after,p=a.data||null,g="undefined"!==typeof XMLHttpRequest?new XMLHttpRequest:"undefined"!==typeof ActiveXObject?new ActiveXObject("Microsoft.XMLHTTP"):null,q=0,m,r="GET"===k&&a.binary;try{g.onreadystatechange=d;g.open(k,b,!0);n&&n(g,a);r&&g.overrideMimeType&&g.overrideMimeType("text/plain; charset=x-user-defined");p&&g.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
for(m in l)g.setRequestHeader(m,l[m]);"undefined"!==typeof addEventListener&&addEventListener("beforeunload",e,!1);g.send(p);f=setTimeout(function(){e(1,408)},1E3*(a.timeout||10))}catch(v){e(0,400)}}function w(b){var a=[],c=m,d=b.split(""),e=-1,f;f=d.length;for(b=f%8;b--;)++e,a[e]=c[d[e]];for(b=f>>3;b--;)a.push(c[d[++e]],c[d[++e]],c[d[++e]],c[d[++e]],c[d[++e]],c[d[++e]],c[d[++e]],c[d[++e]]);return a}function v(b){var a=[],c=0,d=-1,e=b.length,f=[0,2,1][b.length%3],c=x,k=A;if("undefined"!==typeof btoa){for(;d<
e;)a.push(c[b[++d]]);return btoa(a.join(""))}for(--e;d<e;)c=b[++d]<<16|b[++d]<<8|b[++d],a.push(k[c>>18&63],k[c>>12&63],k[c>>6&63],k[c&63]);1<f&&(a[a.length-2]="=");0<f&&(a[a.length-1]="=");return a.join("")}/MSIE/.test(navigator.userAgent);var r={},m={},x={},A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""),l={8:128,16:32768,32:2147483648},z=/.{8}/g;self.importScripts&&(onmessage=function(b){"pack"===b.data.method?postMessage(v(n(b.data.data))):postMessage(u(b.data.data))});
(function(){for(var b=0,a;256>b;++b)a=String.fromCharCode(b),r[("0000000"+b.toString(2)).slice(-8)]=b,m[a]=b,x[b]=a;for(b=128;256>b;++b)m[String.fromCharCode(63232+b)]=b})();module.exports={pack:n,unpack:u,worker:"msgpack.js",upload:function(b,a,c){a.method="PUT";a.binary=!0;if(a.worker&&"undefined"!==typeof Worker){var d=new Worker(msgpack.worker);d.onmessage=function(d){a.data=d.data;q(b,a,c)};d.postMessage({method:"pack",data:a.data})}else a.data=v(n(a.data)),q(b,a,c)},download:function(b,a,c){a.method=
"GET";a.binary=!0;q(b,a,c)}}})();

}, {}],
4: [function(require, module, exports) {
'use strict';

var EXTRA = [-2147483648, 8388608, 32768, 128];
var SHIFT = [24, 16, 8, 0];

var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

var blocks = [];

module.exports = function(message) {
    let notString = typeof(message) !== 'string';

    if (notString && message.constructor == ArrayBuffer) {
        message = new Uint8Array(message);
    }

    var h0, h1, h2, h3, h4, h5, h6, h7, block, code, first = true,
        end = false,
        i, j, index = 0,
        start = 0,
        bytes = 0,
        length = message.length,
        s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

    h0 = 0x6a09e667;
    h1 = 0xbb67ae85;
    h2 = 0x3c6ef372;
    h3 = 0xa54ff53a;
    h4 = 0x510e527f;
    h5 = 0x9b05688c;
    h6 = 0x1f83d9ab;
    h7 = 0x5be0cd19;

    block = 0;
    do {
        blocks[0] = block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
            blocks[4] = blocks[5] = blocks[6] = blocks[7] =
            blocks[8] = blocks[9] = blocks[10] = blocks[11] =
            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
        if (notString) {
            for (i = start; index < length && i < 64; ++index) {
                blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
            }
        } else {
            for (i = start; index < length && i < 64; ++index) {
                code = message.charCodeAt(index);
                if (code < 0x80) {
                    blocks[i >> 2] |= code << SHIFT[i++ & 3];
                } else if (code < 0x800) {
                    blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                } else if (code < 0xd800 || code >= 0xe000) {
                    blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                } else {
                    code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
                    blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                }
            }
        }
        bytes += i - start;
        start = i - 64;
        if (index == length) {
            blocks[i >> 2] |= EXTRA[i & 3];
            ++index;
        }
        block = blocks[16];
        if (index > length && i < 56) {
            blocks[15] = bytes << 3;
            end = true;
        }

        var a = h0,
            b = h1,
            c = h2,
            d = h3,
            e = h4,
            f = h5,
            g = h6,
            h = h7;
        for (j = 16; j < 64; ++j) {
            // rightrotate
            t1 = blocks[j - 15];
            s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
            t1 = blocks[j - 2];
            s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
            blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
        }

        bc = b & c;
        for (j = 0; j < 64; j += 4) {
            if (first) {
                ab = 704751109;
                t1 = blocks[0] - 210244248;
                h = t1 - 1521486534 << 0;
                d = t1 + 143694565 << 0;
                first = false;
            } else {
                s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
                s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
                ab = a & b;
                maj = ab ^ (a & c) ^ bc;
                ch = (e & f) ^ (~e & g);
                t1 = h + s1 + ch + K[j] + blocks[j];
                t2 = s0 + maj;
                h = d + t1 << 0;
                d = t1 + t2 << 0;
            }
            s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
            s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
            da = d & a;
            maj = da ^ (d & b) ^ ab;
            ch = (h & e) ^ (~h & f);
            t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
            t2 = s0 + maj;
            g = c + t1 << 0;
            c = t1 + t2 << 0;
            s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
            s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
            cd = c & d;
            maj = cd ^ (c & a) ^ da;
            ch = (g & h) ^ (~g & e);
            t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
            t2 = s0 + maj;
            f = b + t1 << 0;
            b = t1 + t2 << 0;
            s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
            s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
            bc = b & c;
            maj = bc ^ (b & d) ^ cd;
            ch = (f & g) ^ (~f & h);
            t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
            t2 = s0 + maj;
            e = a + t1 << 0;
            a = t1 + t2 << 0;
        }

        h0 = h0 + a << 0;
        h1 = h1 + b << 0;
        h2 = h2 + c << 0;
        h3 = h3 + d << 0;
        h4 = h4 + e << 0;
        h5 = h5 + f << 0;
        h6 = h6 + g << 0;
        h7 = h7 + h << 0;
    } while (!end);

    let hash = new Uint8Array(32);

    // block 1
    hash[0]  = (h0 >> 24) & 0xFF,
    hash[1]  = (h0 >> 16) & 0xFF,
    hash[2]  = (h0 >> 8) & 0xFF,
    hash[3]  = (h0) & 0xFF;

    // block 2
    hash[4]  = (h1 >> 24) & 0xFF,
    hash[5]  = (h1 >> 16) & 0xFF,
    hash[6]  = (h1 >> 8) & 0xFF,
    hash[7]  = (h1) & 0xFF;

    // block 3
    hash[8]  = (h2 >> 24) & 0xFF,
    hash[9]  = (h2 >> 16) & 0xFF,
    hash[10] = (h2 >> 8) & 0xFF,
    hash[11] = (h2) & 0xFF;

    // block 4
    hash[12] = (h3 >> 24) & 0xFF,
    hash[13] = (h3 >> 16) & 0xFF,
    hash[14] = (h3 >> 8) & 0xFF,
    hash[15] = (h3) & 0xFF;

    // block 5
    hash[16] = (h4 >> 24) & 0xFF,
    hash[17] = (h4 >> 16) & 0xFF,
    hash[18] = (h4 >> 8) & 0xFF,
    hash[19] = (h4) & 0xFF;

    // block 6
    hash[20] = (h5 >> 24) & 0xFF,
    hash[21] = (h5 >> 16) & 0xFF,
    hash[22] = (h5 >> 8) & 0xFF,
    hash[23] = (h5) & 0xFF;

    // block 7
    hash[24] = (h6 >> 24) & 0xFF,
    hash[25] = (h6 >> 16) & 0xFF,
    hash[26] = (h6 >> 8) & 0xFF,
    hash[27] = (h6) & 0xFF;

    // block 8
    hash[28] = (h7 >> 24) & 0xFF,
    hash[29] = (h7 >> 16) & 0xFF,
    hash[30] = (h7 >> 8) & 0xFF,
    hash[31] = (h7) & 0xFF;

    return hash;
};

}, {}]}, {}, {"1":""})