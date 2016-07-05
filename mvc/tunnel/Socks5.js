exports.constructor = function($scope){

    $scope.running = false
    $scope.actionDoing = false
    $scope.socks5Port = "-"

    var tunnelIdCounter = 0
    $scope.tunnelList = []

    app.service.socks
        .on("listening", ()=>{
            $scope.running = true
            $scope.socks5Port = app.config.socks5.port
            $scope.$apply()
        })
        .on("close", ()=>{
            log("创建本地代理服务端已关闭")
            $scope.running = false
            $scope.socks5Port = '-'
            $scope.$apply()
        })
        .on("error", (err)=>{
            log.error("创建本地代理端口遇到错误，可能被占用。",err.stack)
            $scope.running = false
            $scope.socks5Port = '-'
            $scope.$apply()
        })
        .on("new-tunnel", (tunnel)=>{

            tunnel.id = tunnelIdCounter ++
            $scope.tunnelList[tunnel.id] = tunnel

            tunnel
                .on('ready',()=>{
                    log("代理隧道已经建立")
                })
                .on('error',()=>{
                    log.error("通过远程代理服务器建立隧道遇到错误",err.stack)
                })
                .on('close',()=>{
                    delete $scope.tunnelList[tunnel.id]
                })
        })
        .on("forward-error", (err)=>{
            log.error("通过代理服务器请求遇到错误",err.stack)
        })

    $scope.run = function(){
        if( app.service.socks.isListening() ) {
            $scope.running = true
            return
        }
        app.service.socks
            .once("listening", doAction())
            .once("error", doAction())
            .start(app.config.socks5.port)
    }

    $scope.stop = function(){
        app.service.socks
            .once("close", doAction())
            .stop()
    }

    $scope.deleteRule = function(tunnel){
        ttt= tunnel
        log(tunnel._sock)
    }

    function doAction() {
        $scope.actionDoing = true
        return function done(){
            $scope.actionDoing = false
            $scope.$apply()
        }
    }

    // 自动启动
    $scope.run()

    require("request")("http://ip.cn")
}
