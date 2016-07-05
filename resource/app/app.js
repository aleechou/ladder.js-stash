app = {
    config: {}
}

// 读取本地的 config.json 文件
try{
    app.config = require(__dirname+"/../../config.json")
} catch(e) {
    if(e.code=="MODULE_NOT_FOUND") {
        app.config = require(__dirname+"/config.default.json")
    }
    else {
        throw e
    }
}

// 整理 app.config.socks5.ssh
var fs = require('fs');
try{
    if( app.config.socks5.ssh["private-key"] ){
        app.config.socks5.ssh.privateKey = fs.readFileSync(app.config.socks5.ssh["private-key"])
    }
}catch(e) {
    log.error(e)
}
