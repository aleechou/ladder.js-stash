(function($){

var version = "0.1.1"

var dname_prefix = "anchor-layout$"

var anchorPoints = {
    "lfttop":   [ calculateTop,     calculateLeft   ]
    , "topmid": [ calculateTop,     calculateMidH   ]
    , "rgttop": [ calculateTop,     calculateRight  ]
    , "lftmid": [ calculateMidV,    calculateLeft   ]
    , "center": [ calculateMidV,    calculateMidH   ]
    , "rgtmid": [ calculateMidV,    calculateRight  ]
    , "lftbtm": [ calculateBottom,  calculateLeft   ]
    , "btmmid": [ calculateBottom,  calculateMidH   ]
    , "rgtbtm": [ calculateBottom,  calculateRight  ]
    , "top":    [ calculateTop      ]
    , "btm":    [ calculateBottom   ]
    , "lft":    [ calculateLeft     ]
    , "rgt":    [ calculateRight    ]
}
var anchorAlias = {
    "toplft": "lfttop"
    , "toprgt": "rgttop"
    , "btmlft": "lftbtm"
    , "btmrgt": "rgtbtm"
    , "midtop": "topmid"
    , "midbtm": "btmmid"
    , "midlft": "lftmid"
    , "midrgt": "rgtmid"
}
var mapPointsAlias = {}
for(var name in anchorAlias){
    mapPointsAlias[ anchorAlias[name] ] = name
}

function isValidAnchorName(name) {
    return !!anchorPoints[name] || !!anchorAlias[name]
}

var isDebug = false

var log = function defaultLogger() {
    console.log.apply(console,arguments)
}
var error = function defaultErrorLogger() {
    console.error.apply(console,arguments)
}

// API ----------------------------------
var api = {
    "bounds": function(){
        var anchors = []
        api.forEach.call(this,function(anchor){
            if( anchor.target )
                anchors.push(anchor)
        })
        return anchors
    } ,

    "forEach": function(callback){
        if(!callback)
            return this
        for(var name in anchorPoints){
            callback.call(this, this.anchor(name) )
        }
    } ,

    "width": makeSizeSetterGetter("width") ,
    "height": makeSizeSetterGetter("height") ,

    "debug": function(val){
        if(val==undefined)
            return isDebug || !!this.data(dname_prefix+"debug")
        else {
            this.data(dname_prefix+"debug",!!val)
            return this
        }
    } ,

    "id": function(val){
        if(val==undefined)
            return this.data(dname_prefix+"element-id")
        else {
            this.data(dname_prefix+"element-id",val)
            return this
        }
    } ,

    "init": function(){
        this.each(function(){
            initDomNode(this)
        })
        return this
    } ,

    "show-chain": function(indent) {
        var anchorLst = this.anchor("bounds")
        if(!anchorLst.length)
            return
        if(!indent) indent = ''
        console.log(indent, this[0], ":")
        anchorLst.forEach(function(anchor){
            console.log(
                indent+"    " + anchor.position + "("+anchor.x+","+anchor.y+")"
                , "--->" + "[offset:"+anchor.xoffset+","+anchor.yoffset+"]" + "--->"
                // , "<"+anchor.target.$element.tagName+">"
                , anchor.target.position + "("+anchor.target.x+","+anchor.target.y+")"
            )

            anchor.target.$element.anchor("show-chain", indent+"    ")
        })
    } ,

    "awake": function(){
        updateRect(this)
    } ,
}

var staticApi = {
    "logger": function(pipe, loggerFunc){
        if(typeof loggerFunc!="function")
            throw new Error("loggerFunc must be a function")
        if(pipe=="log") {
            log = loggerFunc
        }
        else if(pipe=="error") {
            error = loggerFunc
        }
    } ,

    "list": function(filter) {
        layoutingElementPool.forEach(function($el){
            if(filter && filter!=$el[0])
                return
            $el.anchor("forEach", function(anchor){
                if(!anchor.target)
                    return
                console.log(
                    $el[0]
                    , anchor.position
                    , "-->"
                    , anchor.target.$element[0]
                    , anchor.position
                    , this.xoffset, this.yoffset
                )
            })
        })
    } ,

    "loop-once": function(checkOffset) {
        layoutingElementPool.forEach(function($el){
            onUpdateRect($el)
        })
    } ,
}

function makeSizeSetterGetter(way) {
    return function(val){
        if(!this.length)
            return this
        if(val==undefined) {
            return this.data(dname_prefix+"declear-"+way)
        }
        else {
            var val = parseInt(val)
            if(isNaN(val)){
                error("val is not a valid number")
            }
            else {
                this.data(dname_prefix+"declear-"+way, val)
            }
            return this
        }
    }
}

function makeApiEntrance(api, cbUnknowAction) {
    return function(action){
        if(!this.length)
            return this
        if(api[action]) {
            var args = {}
            for(var i=1;i<arguments.length;i++){
                args[i-1] = arguments[i]
            }
            args.length = arguments.length-1
            return api[action].apply(this,args)
        }

        else if(cbUnknowAction) {
            return cbUnknowAction.apply(this,arguments)
        }
    }
}

$.anchor = makeApiEntrance(staticApi, function(action){
    throw new Error("unknow action for $.anchor(): "+action)
})
$.fn.anchor = makeApiEntrance(api, function(action){
    if(isValidAnchorName(action)) {
        var position = action
        return this.data(dname_prefix+position)
    }
    throw new Error("unknow action for $.fn.anchor(): "+action)
})


Object.keys(anchorPoints).forEach(function(point){
    $.fn[point] = function(){

        if( !this.length ){
            error("unknow element: ",this.selector)
            return
        }

        var target = null
        var targetAnchor = point

        var intArgs = []
        var stringArgs = []
        for(var i=0;i<arguments.length;i++){
            var int = parseInt(arguments[i])
            if( !isNaN(int) ){
                intArgs.push(int)
            }
            else if( typeof arguments[i] == "string" ) {
                stringArgs.push(arguments[i])
            }
        }
        if(intArgs.length>=2) {
            var xoffset = parseInt(intArgs[0])
            var yoffset = parseInt(intArgs[1])
        }
        else if(intArgs.length==1){
            var xoffset = parseInt(intArgs[0])
            var yoffset = xoffset
        }
        else {
            var xoffset = 0
            var yoffset = 0
        }

        if(stringArgs.length>=2) {
            target = stringArgs[0]
            targetAnchor = stringArgs[1]
        }
        else if(stringArgs.length==1) {
            if( isValidAnchorName(stringArgs[0]) ){
                targetAnchor = stringArgs[0]
            }
            else {
                target = stringArgs[0]
            }
        }

        if( anchorAlias[targetAnchor] ){
            targetAnchor = anchorAlias[targetAnchor]
        }
        if( anchorAlias[target] ){
            target = anchorAlias[target]
        }

        if(!target || target=="parent")
            var $target = this.parent()
        else if(target=="window")
            var $target = $(window)
        else
            var $target = $(target)

        if(!$target.length) {
            error("can not bind to unknow element: ",target)
            return
        }

        initElementAnchors($target)
        initElementAnchors(this)

        this.css("position","absolute")

        this.anchor(point).bindTo($target,targetAnchor,xoffset,yoffset)

        return this
    }
})


// -----------------------------------

function Anchor($element, position) {
    this.id = Anchor.counter ++
    this.$element = $element
    this.position = position
    this.x = 0
    this.y = 0
    this.debug = false

    // bind to target
    this.target = null
    this.xoffset = 0
    this.yoffset = 0

    // be bound with
    this._binds = {}
}
Anchor.counter = 0

Anchor.prototype.bindTo = function ($target, targetAnchor, xoffset, yoffset) {
    if(!$target.length) {
        return
    }

    // 先断开之前的绑定
    this.unbind()

    if( this.$element.anchor("debug") )
        log("binding anchor:",this,"-->",this.target)

    this.target = $target.anchor(targetAnchor || this.position)
    if(!this.target) {
        throw new Error("can not create anchor point:"+(targetAnchor||this.position))
    }

    this.xoffset = xoffset || 0
    this.yoffset = yoffset || 0

    this.target._binds[ this.id ] = this

    updateRect(this.$element)
}

Anchor.prototype.unbind = function () {
    if(this.target) {
        this.target._binds[ this.id ] = undefined
        delete this.target._binds[ this.id ]
    }
    this.target = null
    this.offset = 0
}

Anchor.prototype.locate = function () {
    if(this.target) {
        return {
            x: this.target.x + this.xoffset ,
            y: this.target.y + this.yoffset
        }
    }
}


var layoutingElementCount = 0
function initElementAnchors($el){

    if( !$el.length || $el.anchor("id")!=undefined ){
        return
    }

    var points = $el.queryAnchorPoints()
    for(var anchorName in points) {
        var anchor = new Anchor($el, anchorName)
        anchor.x = points[anchorName][0]
        anchor.y = points[anchorName][1]

        $el.data(dname_prefix+anchorName, anchor)
    }

    if($el[0]!=window) {
        // 监听位置变化
        // observer.observe($el[0], {attributes: true, attributeFilter: ["style"] })
        // 监听尺寸变化
        if( !layoutingElementPool.includes($el) )
            layoutingElementPool.push($el)
    }

    $el.anchor( "id", layoutingElementCount++ )
}

$.fn.queryAnchorPoints = function () {
    var offset = this.offset() || {left:0, top:0}  // window 元素无法返回 offset()
    var width = this.outerWidth(true)
    var height = this.outerHeight(true)
    var right = offset.left+width
    var bottom = offset.top+height
    var midH = offset.left+width/2
    var midV = offset.top+height/2
    var points = {
        topmid:     [midH,          offset.top] ,
        btmmid:     [midH,          bottom] ,
        lftmid:     [offset.left,   midV] ,
        rgtmid:     [right,         midV] ,
        lfttop:     [offset.left,   offset.top] ,
        rgttop:     [right,         offset.top] ,
        lftbtm:     [offset.left,   bottom] ,
        rgtbtm:     [right,         bottom] ,
        center:     [midH,          midV] ,
    }
    points.top = points.topmid
    points.btm = points.btmmid
    points.lft = points.lftmid
    points.rgt = points.rgtmid

    return points
}

function calculateTop(anchorPoint, rect) {
    if( rect.y==null )
        rect.y = anchorPoint.y
}
function calculateMidV(anchorPoint, rect) {
    if(rect.y==null)
        rect.y = anchorPoint.y-(rect.height/2)
    else
        rect.height = (anchorPoint.y-rect.y)*2
}
function calculateBottom(anchorPoint, rect) {
    if(rect.y==null)
        rect.y = anchorPoint.y-rect.height
    else
        rect.height = anchorPoint.y-rect.y
}
function calculateLeft(anchorPoint, rect) {
    if( rect.x==null )
        rect.x = anchorPoint.x
}
function calculateMidH(anchorPoint, rect) {
    if(rect.x==null)
        rect.x = anchorPoint.x-(rect.width/2)
    else
        rect.width = (anchorPoint.x-rect.x)*2
}
function calculateRight(anchorPoint, rect) {
    if(rect.x==null)
        rect.x = anchorPoint.x-rect.width
    else
        rect.width = anchorPoint.x-rect.x
}

function updateRect($el){

    var oldWidth = $el.outerWidth(true)
    var oldHeight = $el.outerHeight(true)
    var rect = {
        x: null
        , y: null
        , width: $el.anchor("width") || oldWidth
        , height: $el.anchor("height") || oldHeight
    }

    var isDebug = $el.anchor("debug")
    isDebug && log("updating rect",$el[0],rect)

    for(var anchorName in anchorPoints){
        var anchor = $el.anchor(anchorName)
        var point = anchor.locate()
        if(!point) {
            continue
        }
        isDebug && log("  calculating rect:", point, anchor.target)
        anchorPoints[anchorName].forEach(function(func){
            func(point, rect)
        })
    }


    isDebug && log( "  ", $el[0] )
    isDebug && log("  =>",rect)

    if(oldWidth!=rect.width) {
        isDebug && log("    change width",oldWidth,">",rect.width)
        $el.outerWidth(rect.width)
    }
    if(oldHeight!=rect.height) {
        isDebug && log("    change height",oldHeight,">",rect.height)
        $el.outerHeight(rect.height)
    }

    var newOffset = {top:rect.y||0, left:rect.x||0}
    isDebug && log("    change offset",$el.offset(),">",newOffset)
    isDebug && log("visible:",$el.is(":visible"),$el.css("position"),$el.position())
    $el.offset(newOffset)

    isDebug && log( "  ", $el[0] )
}


function onUpdateRect($el){

    // 不对 隐藏元素 进行处理，隐藏元素无法获得 $el.offset() 值
    if( !$el.is(":visible") ){
        return
    }

    var newPoints = $el.queryAnchorPoints()

    var toBeUpdatedElements = {}
    var needMove = false

    var isDebug = $el.anchor("debug")

    for(var pointName in newPoints){

        var anchor = $el.anchor(pointName)
        if(anchor.x==newPoints[pointName][0] && anchor.y==newPoints[pointName][1])
            continue

        isDebug && console.log("anchor point has moved:", anchor, "->", newPoints[pointName])

        // 检查该锚点是否绑定到其他元素
        if( anchor.target )
            needMove = true

        // 检查影响到的其他元素上的锚点
        for(var id in anchor._binds) {
            isDebug && console.log("  be bound with:", anchor._binds[id])
            toBeUpdatedElements[ anchor._binds[id].$element.anchor("id") ] = anchor._binds[id].$element
        }

        anchor.x = newPoints[pointName][0]
        anchor.y = newPoints[pointName][1]
    }

    isDebug && toBeUpdatedElements.length
            && console.log("effected elements:", toBeUpdatedElements)

    for(var id in toBeUpdatedElements) {
        updateRect( toBeUpdatedElements[id] )
    }

    if(needMove) {
        updateRect( $el )
    }
}

var layoutingElementPool = []

var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if( $(mutation.target).anchor("debug") ){
            log(mutation)
        }
        onUpdateRect($(mutation.target))
    })
})


// 初始化 dom 上的元素
function initDomNode(el) {
    // width, height
    $(el).find("[width]").each(function(){
        $(this).anchor( "width", $(this).attr("width") )
    })
    $(el).find("[height]").each(function(){
        $(this).anchor( "height", $(this).attr("height") )
    })

    // 元素上的锚点定义
    for(var name in anchorPoints){
        var $el = $(el)
        var selector = "["+name+"]"

        // 处理元素本身
        if($el.is(selector)) {
            var args = $el.attr(name).split(",")
            $el[name] .apply($el, args)
        }

        // 处理下级元素
        $el.find("["+name+"],["+mapPointsAlias[name]+"]").each(function(){
            var $this = $(this)
            var args = ($this.attr(name)||$this.attr(mapPointsAlias[name])||"").split(",")
            $this[name] .apply($this, args)
        })
    }

    staticApi["loop-once"]()
}
$(function(){
    initDomNode(document.body)
})

//setInterval(staticApi["loop-once"], 1000)

$(window).resize(function(){
    onUpdateRect($(window))
})

if(!Array.prototype.includes) {
    Array.prototype.includes = function(val){
        for(var i=0;i<this.length;i++){
            if(this[i]==val)
                return true
        }
        return false
    }
}

}) (jQuery)
