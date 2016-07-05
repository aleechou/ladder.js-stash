var child_process = require('child_process')
function exec(cmd){
    // log("run cmdline:",cmd)
    child_process.exec.apply(child_process,arguments)
}



function newChain(name, cb) {
    exec("sudo iptables -t nat -N "+name,function(err){
        if(err) {
            if(!err.message.match("iptables: Chain already exists"))
                message.error("初始化 iptables 遇到错误",err.stack)
        }
        cb && cb(err)
    })
}

function ensureRule(table,chain,rule) {
    // 先移除，避免重复
    exec("sudo iptables -t "+table+" -D "+chain+" "+rule,function(err){

        if(err) log.error(err.stack)

        // 再插入
        exec("sudo iptables -t "+table+" -A "+chain+" "+rule, function(err){
            if(err) log.error(err.stack)
            else log("ok:",table,chain,rule)
        })
    })
}

exports.constructor = function($scope){

    $scope.addingHost = "42.159.28.168"
    $scope.redirectHostList = {}

    //
    newChain("LADDER",function(){
        ensureRule('nat','OUTPUT','-p tcp -j LADDER')
    })
    ensureRule('nat','OUTPUT', "-p udp --dport 53 -j DNAT --to-destination 127.0.0.1:" + app.config.dns.port)
    ensureRule('nat','OUTPUT', "-p udp --dport "+app.config.dns["out-port"]+" -j DNAT --to-destination :53")
    // ensureRule('nat','OUTPUT', "-p tcp --dport "+app.config.dns["out-port"]+" -j DNAT --to-destination :53")


    // 加入代理ip
    $scope.addHost = function(ip){

        $scope.reloadRules((list)=>{

            if( list[ip] ){
                return
            }

            exec(
                "sudo iptables -t nat -A LADDER -p tcp -d"
                + ip
                + " -j REDIRECT --to-ports "
                + app.config.socks5.port
                , function() {
                    $scope.reloadRules()
                }
            )
        }, true)
    }

    // 重载 iptables 的规则表
    $scope.reloadRules = function(cb, noLoading){

        $scope.listLoading = true

        routeList((error, list)=>{

            $scope.listLoading = false
            $scope.redirectHostList = list
            $scope.$apply()

            cb && cb(list)
        })
    }


    $scope.deleteRule = function(host){

        $scope.reloadRules((list)=>{

            if(!list[host])
                return

            $scope.listLoading = true

            exec("sudo iptables -t nat -D LADDER "+list[host].id, function(err,stdout){
                if(err) {
                    message.error(err.stack)
                }

                log(stdout)

                $scope.reloadRules()
            })
        })
    }

    $scope.deleteAllRule = function(){
        exec("sudo iptables -t nat -F LADDER ", function(err,stdout){
            if(err) {
                message.error(err.stack)
            }
        })
    }

    app.service.dns.on("blocked-host",(record)=>{
        if( $scope.redirectHostList[record.address] ){
            return
        }
        $scope.addHost(record.address)
    })

    setInterval($scope.reloadRules,1000)
}

function routeList(cb) {
    exec("sudo iptables -L -t nat -n --line-numbers -v", function(err,stdout){
        var list = {}
        stdout.toString().split("\n\n").forEach((block)=>{
            if( !block.match(/^Chain LADDER/) ){
                return
            }
            var lines = block.split("\n")
            if(lines<3) {
                return
            }

            lines.shift()
            lines.shift()
            lines.forEach((line)=>{
                var fields = line.split(/ +/)
                if(fields[3]!="REDIRECT")
                    return
                var host = fields[9]
                list[host] = {
                    id: fields[0]
                    , destination: fields[9]
                    , pkts: fields[1]
                    , bytes: fields[2]
                    , doname: app.service.dns.revertHostname[host]
                }
            })
        })
        //log(stdout.toString())
        //log(list)

        cb (null, list)
    })
}
