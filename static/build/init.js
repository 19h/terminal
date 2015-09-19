(function outer(modules, cache, entries){

  /**
   * Global
   */

  var global = (function(){ return this; })();

  /**
   * Require `name`.
   *
   * @param {String} name
   * @param {Boolean} jumped
   * @api public
   */

  function require(name, jumped){
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
    var m = { exports: {} };
    var mod = modules[id];
    var name = mod[2];
    var fn = mod[0];

    fn.call(m.exports, function(req){
      var dep = modules[id][1][req];
      return require(dep || req);
    }, m, m.exports, outer, modules, cache, entries);

    // store to cache after successful resolve
    cache[id] = m;

    // expose as `name`.
    if (name) cache[name] = cache[id];

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

let events = require("./events.js");

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

				this.command.disabled = true;
				this.emit('command', this.command.value);
			}
		}, true);
	}

	// write partial message, non-exit
	write (msg) {
		msg = msg.split('\n').map((line) => line.trim());
		msg = msg.map((line) => {
			return new TerminalLine(line);
		});

		let fakeInputLine = new TerminalCommandLine();

		fakeInputLine.setDisabled(true);
		fakeInputLine.setInput(this.command.value);
		fakeInputLine.setPrompt(this._getPromptPrefix());

		this.lineFeed.push(fakeInputLine);

		msg.forEach((line) => {
			this.lineFeed.push(line);
		});
	}

	// quit command
	commit (msg) {
		this.command.value = '';
		this.command.disabled = false;

		this.command.focus();
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
};

class apx extends events {
	constructor () {
		super();

		this.initKeychain();
		this.registerRealtime();
	}

	initKeychain () {
		this.keypair = sodium.crypto_box_keypair();

	}

	registerRealtime () {
		this.io = io();

		this.io.on('hi', (msg) => {
			this.initTerminal();
		});

		this.io.on('prefix', (prefix) => {

		})

		this.handshake();
	}

	handshake () {
		let user = localStorage.id;

		this.io.emit('login', user || '');
	}

	initTerminal () {
		this.terminal = new Terminal();

		this.terminal.on('command', (msg) => {
			this.terminal.write('yolo\nyo\nlo');
			this.terminal.commit();
		});
	}
};

new apx();
}, {"./events.js":2}],
2: [function(require, module, exports) {
var domain;function EventEmitter(){EventEmitter.init.call(this)}module.exports=EventEmitter;EventEmitter.EventEmitter=EventEmitter;EventEmitter.usingDomains=!1;EventEmitter.prototype.domain=void 0;EventEmitter.prototype._events=void 0;EventEmitter.prototype._maxListeners=void 0;EventEmitter.defaultMaxListeners=10; EventEmitter.init=function(){this.domain=null;EventEmitter.usingDomains&&(domain=domain||require("domain"),!domain.active||this instanceof domain.Domain||(this.domain=domain.active));this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events={},this._eventsCount=0);this._maxListeners=this._maxListeners||void 0};EventEmitter.prototype.setMaxListeners=function(b){if("number"!==typeof b||0>b||isNaN(b))throw new TypeError("n must be a positive number");this._maxListeners=b;return this}; function $getMaxListeners(b){return void 0===b._maxListeners?EventEmitter.defaultMaxListeners:b._maxListeners}EventEmitter.prototype.getMaxListeners=function(){return $getMaxListeners(this)};function emitNone(b,a,c){if(a)b.call(c);else{a=b.length;b=arrayClone(b,a);for(var d=0;d<a;++d)b[d].call(c)}}function emitOne(b,a,c,d){if(a)b.call(c,d);else{a=b.length;b=arrayClone(b,a);for(var e=0;e<a;++e)b[e].call(c,d)}} function emitTwo(b,a,c,d,e){if(a)b.call(c,d,e);else{a=b.length;b=arrayClone(b,a);for(var f=0;f<a;++f)b[f].call(c,d,e)}}function emitThree(b,a,c,d,e,f){if(a)b.call(c,d,e,f);else{a=b.length;b=arrayClone(b,a);for(var g=0;g<a;++g)b[g].call(c,d,e,f)}}function emitMany(b,a,c,d){if(a)b.apply(c,d);else{a=b.length;b=arrayClone(b,a);for(var e=0;e<a;++e)b[e].apply(c,d)}} EventEmitter.prototype.emit=function(b){var a,c,d,e,f,g;a=!1;d="error"===b;if(c=this._events)d=d&&null==c.error;else if(!d)return!1;g=this.domain;if(d){a=arguments[1];if(g)a||(a=Error('Uncaught, unspecified "error" event.')),a.domainEmitter=this,a.domain=g,a.domainThrown=!1,g.emit("error",a);else{if(a instanceof Error)throw a;g=Error('Uncaught, unspecified "error" event. ('+a+")");g.context=a;throw g;}return!1}c=c[b];if(!c)return!1;g&&(g.enter(),a=!0);var h="function"===typeof c;d=arguments.length; switch(d){case 1:emitNone(c,h,this);break;case 2:emitOne(c,h,this,arguments[1]);break;case 3:emitTwo(c,h,this,arguments[1],arguments[2]);break;case 4:emitThree(c,h,this,arguments[1],arguments[2],arguments[3]);break;default:e=Array(d-1);for(f=1;f<d;f++)e[f-1]=arguments[f];emitMany(c,h,this,e)}a&&g.exit();return!0}; EventEmitter.prototype.addListener=function(b,a){var c,d;if("function"!==typeof a)throw new TypeError("listener must be a function");(c=this._events)?(c.newListener&&(this.emit("newListener",b,a.listener?a.listener:a),c=this._events),d=c[b]):(c=this._events={},this._eventsCount=0);d?("function"===typeof d?d=c[b]=[d,a]:d.push(a),d.warned||(c=$getMaxListeners(this))&&0<c&&d.length>c&&(d.warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d %s listeners added. Use emitter.setMaxListeners() to increase limit.", d.length,b),console.trace())):(c[b]=a,++this._eventsCount);return this};EventEmitter.prototype.on=EventEmitter.prototype.addListener;EventEmitter.prototype.once=function(b,a){function c(){this.removeListener(b,c);d||(d=!0,a.apply(this,arguments))}if("function"!==typeof a)throw new TypeError("listener must be a function");var d=!1;c.listener=a;this.on(b,c);return this}; EventEmitter.prototype.removeListener=function(b,a){var c,d,e,f;if("function"!==typeof a)throw new TypeError("listener must be a function");d=this._events;if(!d)return this;c=d[b];if(!c)return this;if(c===a||c.listener&&c.listener===a)0===--this._eventsCount?this._events={}:(delete d[b],d.removeListener&&this.emit("removeListener",b,a));else if("function"!==typeof c){e=-1;for(f=c.length;0<f--;)if(c[f]===a||c[f].listener&&c[f].listener===a){e=f;break}if(0>e)return this;if(1===c.length){c[0]=void 0; if(0===--this._eventsCount)return this._events={},this;delete d[b]}else spliceOne(c,e);d.removeListener&&this.emit("removeListener",b,a)}return this}; EventEmitter.prototype.removeAllListeners=function(b){var a;a=this._events;if(!a)return this;if(!a.removeListener)return 0===arguments.length?(this._events={},this._eventsCount=0):a[b]&&(0===--this._eventsCount?this._events={}:delete a[b]),this;if(0===arguments.length){a=Object.keys(a);for(var c=0,d;c<a.length;++c)d=a[c],"removeListener"!==d&&this.removeAllListeners(d);this.removeAllListeners("removeListener");this._events={};this._eventsCount=0;return this}a=a[b];if("function"===typeof a)this.removeListener(b, a);else if(a){do this.removeListener(b,a[a.length-1]);while(a[0])}return this};EventEmitter.prototype.listeners=function(b){var a=this._events;b=a?(b=a[b])?"function"===typeof b?[b]:arrayClone(b,b.length):[]:[];return b};EventEmitter.listenerCount=function(b,a){return"function"===typeof b.listenerCount?b.listenerCount(a):listenerCount.call(b,a)};EventEmitter.prototype.listenerCount=listenerCount; function listenerCount(b){var a=this._events;if(a){b=a[b];if("function"===typeof b)return 1;if(b)return b.length}return 0}function spliceOne(b,a){for(var c=a,d=c+1,e=b.length;d<e;c+=1,d+=1)b[c]=b[d];b.pop()}function arrayClone(b,a){for(var c=Array(a);a--;)c[a]=b[a];return c}
}, {}]}, {}, {"1":""})