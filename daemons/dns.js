const dns = require('native-dns')
const util = require('util')
const EventEmitter = require('events')
const fs = require('fs')

dns.platform.cache = true


function DnsProxy() {

    EventEmitter.call(this)

    this.blockedList = DnsProxy.loadBlockedListFile()
    this.revertHostname = {}
}
DnsProxy.prototype = {
    __proto__: EventEmitter.prototype
}

DnsProxy.loadBlockedListFile = function(path){
    var list = []
    var blockedListContent = fs.readFileSync(path || process.cwd()+"/blocked-list.txt")
    if(blockedListContent) {
        blockedListContent.toString()
            .split(/\s+/).forEach((line)=>{
                if(line) list.push(line)
            })
    }
    return list
}

DnsProxy.prototype.isBlockedDoname = function(doname) {

    doname = doname.toLowerCase()

    for(var i=0;i<module.exports.blockedList.length;i++){
        var rule = module.exports.blockedList[i]

        // log(rule,"==",doname)

        if(rule[0]=='.' && (
            doname.substr(- rule.length)==rule  // www.doname.com == .doname.com
            || rule.substr(1)==doname           // doname.com == .doname.com
        ))
            return true
        else if( rule==doname )
            return true
    }

    return false
}


DnsProxy.queryUpstream = function(server,question,cb) {
    var req = dns.Request({
        question: dns.Question(question)
        , server: server
        , timeout: 3000
    })
    req.on('timeout', function () {
        cb && cb( new Error("timeout") )
    })
    req.on('message', cb)
    req.on('end', function () {})
    req.send()
}

DnsProxy.prototype.start = function() {

    var dnsproxy = this
    var server = dns.createServer();

    server.on('request', function (request, response) {

        var question = request.question[0]
        var qname = question.name

        var blocked = dnsproxy.isBlockedDoname(question.name)
        var serverList = app.config.dns[ blocked? "save-upstream-servers": "upstream-servers" ]

        var resolved = false
        var rspnNum = 0

        serverList.forEach(function(server){
            DnsProxy.queryUpstream( server, question, function (err, answer) {
                // err && log.error(err,server, question)
                rspnNum ++
                if(resolved) return

                if(!err) {
                    resolved = true
                    onUpstreamRspn(server,answer)
                    return
                }

                // 可信上游服务器 均不可用
                if( rspnNum==serverList.length && blocked ){

                    log("所有可信上游服务器均不可用,尝试非可信上游 ...")

                    // 尝试非可信上游
                    app.config.dns["upstream-servers"].forEach(function(server){
                        DnsProxy.queryUpstream( server, question, function (err, answer) {
                            // err && log.error(err,server, question)
                            if(resolved) return

                            if(!err) {
                                resolved = true
                                onUpstreamRspn(server,answer)
                                return
                            }
                        })
                    })

                }

            })
        })

        function onUpstreamRspn(server, answer) {
            // log("upstream dns server rspn", server, question, answer)

            // emit a blocked hostname
            if(blocked) {
                answer.answer.forEach((record)=>{
                    if(record.address) {
                        dnsproxy.revertHostname[record.address] = record.name
                        module.exports.emit("blocked-host",record)
                    }
                })
            }

            response.answer = answer.answer
            response.send()
        }
    })

    server.on('error', function (err, buff, req, res) {
        console.log(err.stack)
    })

    server.serve(app.config.dns.port)
}

module.exports = new DnsProxy
