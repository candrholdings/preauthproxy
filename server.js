!function (ConnectSession, net, Session, url, winston) {
    'use strict';

    var app = require('http').createServer(),
        port = require('./config').port || process.env.port || process.argv[2] || 5865;

    app.on('request', function (req, res) {
        new Session(req, res);
    }).on('connect', function (req, socket, head) {
        new ConnectSession(req, socket, head);

        // var endPoint = url.parse('tcp:' + req.url),
        //     clientSocket = net.connect(endPoint.port, endPoint.hostname);

        // clientSocket.on('connect', function () {
        //     winston.info('CONNECT-ed to ' + endPoint.hostname + ':' + endPoint.port);

        //     clientSocket.write(head);

        //     socket.on('data', function (chunk) {
        //         winston.debug('SENT ' + chunk.length);
        //         clientSocket.write(chunk);
        //     }).on('end', function () {
        //         clientSocket.end();
        //     }).on('error', function (err) {
        //         winston.debug('socket.error', { err: err });
        //         clientSocket.destroy();
        //     });
        // }).on('data', function (chunk) {
        //     winston.debug('RECEIVE ' + chunk.length);
        //     socket.write(chunk);
        // }).on('end', function () {
        //     socket.end();
        // }).on('error', function (err) {
        //     winston.debug('clientsocket.error', { err: err });
        //     socket.destroy();
        // });
    }).listen(port, function () {
        winston.info('Preauth proxy started and listening to port ' + port);
    });

    // require('fs').watch(require('path').dirname(process.argv[1]), function () {
    //     winston.warn('Code updated, exiting');
    //     process.exit(2);
    // });

    winston.remove(winston.transports.Console);

    winston.add(winston.transports.Console, {
        colorize: true,
        level: 'debug'
    });

    var webrootPath = process.env.webroot_path;

    webrootPath && winston.add(winston.transports.File, {
        filename: require('path').resolve(webrootPath, '../../LogFiles/site/winston.log'),
        maxFiles: 5,
        maxsize: 1048576,
        level: 'debug'
    });
}(
    require('./connectsession').ConnectSession,
    require('net'),
    require('./session').Session,
    require('url'),
    require('winston')
);