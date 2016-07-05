
require(__dirname+"/log.js")
require(__dirname+"/app.js")

// 服务
app.service = {
    dns: require(__dirname+"/daemons/dns.js")
    , socks: require(__dirname+"/daemons/socks.js")
}
app.service.dns.start()



// 加载 jquery, angular, semantic
jQuery = $ = require("jquery")


$(()=>{
    console.log("...")

    // 加载 mvc
    require(__dirname+"/controller-loader.js").load( appModule, __dirname+"/mvc" )

    // 初始化 semantic 控件
    $('.ui.menu .item')
        .tab();
    $('.ui.dropdown')
        .dropdown();
    $('.title .popup')
        .popup();


})

require("angular")
require(__dirname+"/lib/semantic.js")
require(__dirname+"/lib/jquery-anchorlayout.js")


var appModule = angular.module("app",[])

appModule.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter)
                })
                event.preventDefault()
            }
        })
    }
})

appModule.directive('ngDimmer', function () {
    return function (scope, element, attrs) {
        scope.$watch(attrs.ngDimmer,function(value){
            element.dimmer(value? 'show': 'hide')
        })
        // log(arguments)
    }
})
