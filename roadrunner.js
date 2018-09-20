module.exports = function(RED) {
    "use strict";
    RED.log.info("rr-gpio : initializing.");
    var exec = require('child_process').exec;
    var spawn = require('child_process').spawn;
    var fs = require('fs');
    var gpioHelper = __dirname+'/gpiod_helper.py';
    process.env.PYTHONUNBUFFERED = 1;

    var pinsInUse = {};

    function GPIOInNode(config) {
        RED.nodes.createNode(this,config);
        this.buttonState = -1;
        this.pin = config.pin; 
        var node = this;
        node.on('input', function(msg) {
            msg.payload = 'TODO: rr-gpio in ' + node.pin;
            node.send(msg);
        });

        if (!pinsInUse.hasOwnProperty(this.pin)) {
            pinsInUse[this.pin] = 'in';
        }
        else {
            if (pinsInUse[this.pin] !== 'in') {
                node.warn(RED._("rr-gpio.errors.alreadyset",{pin:this.pin,type:pinsInUse[this.pin]}));
            }
        }

        if (node.pin !== undefined) {
            node.child = spawn(gpioHelper, ["in",node.pin]);
            node.running = true;
            node.status({fill:"green",shape:"dot",text:"common.status.ok"});

            node.child.stdout.on('data', function (data) {
                var d = data.toString().trim().split("\n");
                for (var i = 0; i < d.length; i++) {
                    if (d[i] === '') { return; }
                    if (node.running && node.buttonState !== -1 && !isNaN(Number(d[i])) && node.buttonState !== d[i]) {
                        node.send({ topic:"rr/"+node.pin, payload:Number(d[i]) });
                    }
                    node.buttonState = d[i];
                    node.status({fill:"green",shape:"dot",text:d[i]});
                    if (RED.settings.verbose) { node.log("out: "+d[i]+" :"); }
                }
            });

            node.child.stderr.on('data', function (data) {
                if (RED.settings.verbose) { node.log("err: "+data+" :"); }
            });

            node.child.on('close', function (code) {
                node.running = false;
                node.child = null;
                if (RED.settings.verbose) { node.log(RED._("rr-gpio.status.closed")); }
                if (node.done) {
                    node.status({fill:"grey",shape:"ring",text:"rr-gpio.status.closed"});
                    node.done();
                }
                else { node.status({fill:"red",shape:"ring",text:"rr-gpio.status.stopped"}); }
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") { node.error(RED._("rr-gpio.errors.commandnotfound")); }
                else if (err.errno === "EACCES") { node.error(RED._("rr-gpio.errors.commandnotexecutable")); }
                else { node.error(RED._("rr-gpio.errors.error",{error:err.errno})) }
            });

        } else {
            node.warn(RED._("rr-gpio.errors.invalidpin")+": "+node.pin);
        }

        node.on("close", function(done) {
            node.status({fill:"grey",shape:"ring",text:"rr-gpio.status.closed"});
            delete pinsInUse[node.pin];
            if (node.child != null) {
                node.done = done;
                node.child.stdin.write("q\n");
                node.child.kill('SIGKILL');
            }
            else { done(); }
        });

    }
    RED.nodes.registerType("rr-gpio in",GPIOInNode);

    function GPIOOutNode(config) {
        RED.nodes.createNode(this,config);
        this.pin = config.pin;
        var node = this;
        node.on('input', function(msg) {
            msg.payload = 'TODO: rr-gpio out ' + node.pin;
            node.send(msg);
        });
    }
    RED.nodes.registerType("rr-gpio out",GPIOOutNode);

    RED.log.info("rr-gpio : initialization complete.");
}

