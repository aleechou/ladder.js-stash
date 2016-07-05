const spawn = require('child_process').spawn;

exports.constructor = function($scope){

    var redsocks

    $scope.running = false

    $scope.run = function(){

        redsocks = spawn('usr/sbin/redsocks', ['-c', 'etc/redsocks.conf'], {cwd:__dirname+"/../../../bin"})
        $scope.running = true

        redsocks.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`)
        })
        redsocks.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`)
        })
        redsocks.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            $scope.running = false
        })

    }

    $scope.stop = function(){
        redsocks && redsocks.kill()
    }

}
