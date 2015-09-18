'use strict';

var events = require("./events.js");

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

		~itemPos && this.lineFeed.splice(itemPos, 1);
	}
}

class Terminal extends events {
	constructor () {
		super();

		this.init();

		this.registerEvents();
	}

	init () {
		this._promptPrefix = 'nobody@apx:~$';

		this.container = this._initContainer();

		this.command = this.container.querySelector('inputline .command');
		this.output = this.container.querySelector('output');

		this.lineFeed = new TerminalLineFeed(this.output);
	}

	_inputLine (readOnly) {
		return new TerminalCommandLine ();
	}

	_initContainer () {
		let container = document.createElement('cream');
		container.className = 'box';

		this.output = document.createElement('output');

		this.inputLine = this._inputLine();

		this.inputLine.setPrompt(this._promptPrefix);
		this.inputLine.setAutofocus(true);

		document.body.appendChild(container);

		container.appendChild(this.output);
		container.appendChild(this.inputLine.getElement());

		return container;
	}

	registerEvents() {
		this.command.addEventListener('keydown', (e) => {
			if (e.keyCode === 13) {
				this.command.disabled = true;
				this.emit('command', this.command.value);
			}
		});
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
		fakeInputLine.setPrompt(this._promptPrefix);

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
};

class apx extends events {
	constructor() {
		super();

		this.terminal = new Terminal();

		this.terminal.on('command', (msg) => {
			setTimeout(() => {
				this.terminal.write('yolo');
				this.terminal.commit();
			}, 2000);
		});
	}
};

new apx();