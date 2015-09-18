var koa = require('koa.io');

var app = koa();

app.use(require('koa-static')('static'));

// middleware for koa
app.use(function*() {

});

// middleware for scoket.io's connect and disconnect
app.io.use(function*(next) {
	// on connect
	yield * next;
	// on disconnect
});

// router for socket event
app.io.route('new message', function*() {
	// we tell the client to execute 'new message'
	var message = this.args[0];
	this.broadcast.emit('new message', message);
});

app.listen(3000);