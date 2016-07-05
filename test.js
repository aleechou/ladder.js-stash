const net = require("net")
const request = require("request")

var socket = net.createServer(function(sock) {
    console.log(
        "sock.address:",
        sock.address() ,
        //sock
    )
})
// .listen(1983)

console.log(socket)


request("http://203.208.39.223/")
