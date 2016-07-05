var request = require('request')
var fs = require('fs')

request("https://raw.githubusercontent.com/koolshare/koolshare.github.io/master/maintain_files/gfwlist.conf", function (error, response, body) {

    if(error) {
        return console.error(error.stack)
    }

    var blockedList = [
        'autoproxy-gfwlist.googlecode.com'
    ]

    var content = body.toString()
    var res
    var reg = /server=\/([^\/]+)\//g
    while(res=reg.exec(content)){
        blockedList.push(res[1])
    }

    fs.writeFileSync(__dirname+"/blocked-list.txt",blockedList.join("\r\n"))
    // console.log(app.service.dns.blockedList)

})
