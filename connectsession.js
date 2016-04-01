!function (config, http, linq, net, Semaphore, url, winston) {
    'use strict';

    var agentKeepAlive = new (require('agentkeepalive'))(),
        proxyHeaderPattern = /^proxy-/i;

    function ConnectSession(req, socket, head) {
        var that = this;

        Semaphore.call(that);

        that._socket = socket;

        that.when('connect', that.whenconnect.bind(that));

        var target = req.url,
            proxyConfig = config().proxy;

        if (proxyConfig) {
            var headers = linq.where(req.headers, function (name) { return !/^proxy-/.test(name); });

            if (proxyConfig.username && proxyConfig.password) {
                headers['proxy-authorization'] = 'BASIC ' + toBase64(proxyConfig.username + ':' + proxyConfig.password);
            }

            http.request({
                headers: headers,
                hostname: proxyConfig.hostname,
                port: proxyConfig.port,
                method: 'CONNECT',
                path: target,
                agent: false
            }).on('connect', function (res, clientSocket, clientHead) {
                if (res.statusCode === 200) {
                    // winston.info('CONNECT-ed to ' + target + ' via proxy');

                    that.flag('connect', clientSocket, socket);

                    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                    socket.write(clientHead);

                    clientSocket.write(head);
                } else {
                    winston.info('Failed to CONNECT to ' + target + ' via proxy, server returned ' + res.statusCode);
                    socket.destroy();
                }
            }).on('error', function (err) {
                winston.info('Failed to CONNECT to ' + target + ' via proxy', { err: err });
                socket.destroy();
            }).end();
        } else {
            var endPoint = url.parse('tcp:' + target),
                clientSocket = net.connect(endPoint.port, endPoint.hostname);

            clientSocket.on('connect', function () {
                // winston.info('CONNECT-ed to ' + target);

                socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

                that.flag('connect', clientSocket, socket);
            }).on('data', function (chunk) {
                socket.write(chunk);
            }).on('end', function () {
                socket.end();
            }).on('error', function (err) {
                winston.info('Failed to CONNECT to ' + target, { err: err });
                socket.destroy();
            });
        }
    }

    require('util').inherits(ConnectSession, Semaphore);

    module.exports.ConnectSession = ConnectSession;

    ConnectSession.prototype.whenconnect = function (s1, s2) {
        s1.on('data', function (chunk) {
            s2.write(chunk);
        }).on('end', function () {
            s2.end();
        }).on('error', function (err) {
            s2.destroy();
        });

        s2.on('data', function (chunk) {
            s1.write(chunk);
        }).on('end', function () {
            s1.end();
        }).on('error', function (err) {
            s1.destroy();
        });
    };

    ConnectSession.prototype.whenerror = function () {
        this._socket.destroy();
    };

    function toBase64(str) {
        return new Buffer(str).toString('base64');
    }
}(
    require('./config'),
    require('http'),
    require('./lib/linq2'),
    require('net'),
    require('./lib/semaphore').Semaphore,
    require('url'),
    require('winston')
);