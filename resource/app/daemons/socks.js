const sockex = require('sockex')
const net = require("net")
const fs = require('fs')
const ssh2 = require('ssh2')
const EventEmitter = require('events')


/**
 * events:
 *   listening
 *   error
 *   close
 *   tunnel-ready
 *   tunnel-error
 *   forward-error
 */
function SocksProxyServer(){

    EventEmitter.call(this)

    this.listening = false

    this.server = net.createServer((sock) => {

        // 获得被 iptables redirect 以前的 目标ip/端口
        var dst = sockex.originalDst(sock._handle)

        var tunnel = new ssh2.Client()
        tunnel.dstHost = dst[0]
        tunnel.dstPort = dst[1]

        this.emit("new-tunnel", tunnel)

        console.log(tunnel)

        tunnel.on('ready', ()=>{

            tunnel._sock
                .on('error', (err)=>{
                    log("tunnel error",tunnel.id)
                    tunnel.emit("error")
                })
                .on('close', ()=>{
                    log("tunnel close",tunnel.id)
                    tunnel.emit("close")
                })

            tunnel.forwardOut(
                sock.remoteAddress, sock.remotePort, tunnel.dstHost, tunnel.dstPort
                , (err, stream)=>{

                    log("stream:",stream)

                    if (err) {
                        this.emit("forward-error", err)
                        tunnel.end()
                        return
                    }
                    stream
                    .on('error', (err) => {
                        this.emit("forward-error", err)
                        log.error(error.stack)
                    })
                    .on('close', () => {
                        log("end tunnel",tunnel)
                        tunnel.end()
                    })
                    .pipe(sock).pipe(stream)
                }
            )
        })
        .on('error', (err)=>{
            log("tunnel error",tunnel.id)
        })
        .connect(app.config.socks5.ssh)


    })
    .on('error', (err) => {
        this.listening = false
        this.emit('close')
    })
    .on('close', () => {
        this.listening = false
        this.emit('close')
    })
    .on('listening', () => {
        this.listening = true
        this.emit('listening')
    })
}
SocksProxyServer.prototype = {
    __proto__: EventEmitter.prototype
}

SocksProxyServer.prototype.start = function(port) {
    this.server.listen(port)
}

SocksProxyServer.prototype.stop = function(port) {
    this.server.close(port)
}

SocksProxyServer.prototype.isListening = function(){
    return this.listening
}

module.exports = new SocksProxyServer
