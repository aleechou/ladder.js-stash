var fs = require("fs")
var pathlib = require("path")

exports.load = function(appModule, mvcFolder) {
    findControllers(mvcFolder, (controller)=>{
        var tmp  = $("[ng-controller="+controller.name+"]")
            .html(fs.readFileSync(controller.templateFile).toString())
        appModule.controller(
            controller.name
            , controller.constructor || function(){}
        )
    })
}

// var SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
// var MOZ_HACK_REGEXP = /^moz([A-Z])/;
// function camelCase(name) {
//     return name.
//         replace(SPECIAL_CHARS_REGEXP, function(_, separator, letter, offset) {
//             return offset ? letter.toUpperCase() : letter;
//         }).
//         replace(MOZ_HACK_REGEXP, 'Moz$1');
// }

function findControllers(folder, cb, prefix) {

    if(!prefix)
        prefix = []
    if(prefix.length)
        prefix.push("")

    fs.readdirSync(folder).forEach((filename)=>{
        var fullpath = folder+"/"+filename
        if( fs.statSync(fullpath).isFile() ){
            if(pathlib.extname(filename).toLowerCase()!=".html"){
                return
            }

            var name = pathlib.basename(filename,pathlib.extname(filename))
            var controllerFile = folder+"/"+name+".js"
            if(fs.existsSync(controllerFile)) {
                var controller = require(controllerFile)
            }

            cb && cb ({
                name: (prefix.join("-") + name).toLowerCase() ,
                templateFile: fullpath ,
                constructor: (controller && typeof controller.constructor=="function")? controller.constructor: null
            })


        }
        else {
            findControllers(fullpath, cb, prefix.concat(filename))
        }
    })

}
