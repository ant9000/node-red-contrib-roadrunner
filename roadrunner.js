module.exports = function(RED) {
    "use strict";
    RED.log.info("rr-gpio : initializing.");
    var exec = require('child_process').execSync;
    var spawn = require('child_process').spawn;
    var fs = require('fs');
    var gpioHelper = __dirname+'/gpiod_helper.py';
    process.env.LD_LIBRARY_PATH = __dirname+'/lib/';
    process.env.PYTHONPATH = __dirname+'/lib/python/';
    process.env.PYTHONUNBUFFERED = 1;

    var initOK = true;
    try {
        var cpuinfo = fs.readFileSync("/proc/cpuinfo").toString();
        if (cpuinfo.indexOf(": Atmel SAMA5") === -1) {
            initOK = false;
            RED.log.warn("rr-gpio : "+RED._("RoadRunner CPU not detected"));
        } else {
            try {
                fs.accessSync('/dev/gpiochip0', fs.constants.R_OK | fs.constants.W_OK)
            } catch(err) {
                initOK = false;
                RED.log.warn("rr-gpio : "+RED._("/dev/gpiochip0 is not writable by user "+process.env.USER+" - see README for a fix"));
            }
            if (initOK) {
                try {
                    exec(gpioHelper);
                } catch(err) {
                    if (err.status == 42) {
                        initOK = false;
                        RED.log.warn("rr-gpio : "+RED._("Python3 bindings for libgpiod not found"));
                    }
                }
            }
        }
    } catch(err) {
        initOK = false;
        RED.log.warn("rr-gpio : "+RED._("RoadRunner detection failed"));
    }

    var pinsInUse = {};

    function GPIOInNode(config) {
        RED.nodes.createNode(this,config);
        this.buttonState = -1;
        this.pin = config.pin; 
        var node = this;

        if (!initOK) {
            node.status({fill:"grey",shape:"dot",text:"node-red:rpi-gpio.status.not-available"});
            return;
        }

        if (!pinsInUse.hasOwnProperty(this.pin)) {
            pinsInUse[this.pin] = 'in';
        } else if (pinsInUse[this.pin] !== 'in') {
            node.warn(RED._("node-red:rpi-gpio.errors.alreadyset",{pin:this.pin,type:pinsInUse[this.pin]}));
        }

        if (node.pin !== undefined) {
            node.child = spawn(gpioHelper, ["in",node.pin]);
            node.running = true;
            node.status({fill:"green",shape:"dot",text:"node-red:common.status.ok"});

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
                if (RED.settings.verbose) { node.log(RED._("node-red:rpi-gpio.status.closed")); }
                if (node.done) {
                    node.status({fill:"grey",shape:"ring",text:"node-red:rpi-gpio.status.closed"});
                    node.done();
                } else {
                    node.status({fill:"red",shape:"ring",text:"node-red:rpi-gpio.status.stopped"});
                }
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") {
                    node.error(RED._("node-red:rpi-gpio.errors.commandnotfound"));
                } else if (err.errno === "EACCES") {
                    node.error(RED._("node-red:rpi-gpio.errors.commandnotexecutable"));
                } else {
                    node.error(RED._("node-red:rpi-gpio.errors.error",{error:err.errno}))
                }
            });

        } else {
            node.warn(RED._("node-red:rpi-gpio.errors.invalidpin")+": "+node.pin);
        }

        node.on("close", function(done) {
            node.status({fill:"grey",shape:"ring",text:"node-red:rpi-gpio.status.closed"});
            delete pinsInUse[node.pin];
            if (node.child != null) {
                node.done = done;
                node.child.stdin.write("q\n");
                node.child.kill('SIGKILL');
            } else { done(); }
        });

    }
    RED.nodes.registerType("rr-gpio in",GPIOInNode);

    function GPIOOutNode(config) {
        RED.nodes.createNode(this,config);
        this.pin = config.pin;
        this.level = config.level;
        var node = this;

        if (!initOK) {
            node.status({fill:"grey",shape:"dot",text:"node-red:rpi-gpio.status.not-available"});
            return;
        }

        if (!pinsInUse.hasOwnProperty(this.pin)) {
            pinsInUse[this.pin] = 'out';
        } else if (pinsInUse[this.pin] !== 'out') {
            node.warn(RED._("node-red:rpi-gpio.errors.alreadyset",{pin:this.pin,type:pinsInUse[this.pin]}));
        }

        function inputlistener(msg) {
            if (msg.payload === "true") { msg.payload = true; }
            if (msg.payload === "false") { msg.payload = false; }
            var out = Number(msg.payload);
            if ((out >= 0) && (out <= 1)) {
                if (RED.settings.verbose) { node.log("out: "+out); }
                if (node.child !== null) {
                    node.child.stdin.write(out+"\n");
                    node.status({fill:"green",shape:"dot",text:msg.payload.toString()});
                } else {
                    node.error(RED._("node-red:rpi-gpio.errors.pythoncommandnotfound"),msg);
                    node.status({fill:"red",shape:"ring",text:"node-red:rpi-gpio.status.not-running"});
                }
            } else {
                node.warn(RED._("node-red:rpi-gpio.errors.invalidinput")+": "+out);
            }
        }

        if (node.pin !== undefined) {
            node.child = spawn(gpioHelper, ["out",node.pin, node.level]);
            node.status({fill:"green",shape:"dot",text:node.level});
            node.running = true;

            node.on("input", inputlistener);

            node.child.stdout.on('data', function (data) {
                if (RED.settings.verbose) { node.log("out: "+data+" :"); }
            });

            node.child.stderr.on('data', function (data) {
                if (RED.settings.verbose) { node.log("err: "+data+" :"); }
            });

            node.child.on('close', function (code) {
                node.child = null;
                node.running = false;
                if (RED.settings.verbose) { node.log(RED._("node-red:rpi-gpio.status.closed")); }
                if (node.done) {
                    node.status({fill:"grey",shape:"ring",text:"node-red:rpi-gpio.status.closed"});
                    node.done();
                } else {
                    node.status({fill:"red",shape:"ring",text:"node-red:rpi-gpio.status.stopped"});
                }
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") {
                    node.error(RED._("node-red:rpi-gpio.errors.commandnotfound"));
                } else if (err.errno === "EACCES") {
                    node.error(RED._("node-red:rpi-gpio.errors.commandnotexecutable"));
                } else {
                    node.error(RED._("node-red:rpi-gpio.errors.error",{error:err.errno}))
                }
            });

        } else {
            node.warn(RED._("node-red:rpi-gpio.errors.invalidpin")+": "+node.pin);
        }

        node.on("close", function(done) {
            node.status({fill:"grey",shape:"ring",text:"node-red:rpi-gpio.status.closed"});
            delete pinsInUse[node.pin];
            if (node.child != null) {
                node.done = done;
                node.child.stdin.write("close "+node.pin);
                node.child.kill('SIGKILL');
            }
            else { done(); }
        });

    }
    RED.nodes.registerType("rr-gpio out",GPIOOutNode);

    RED.httpAdmin.get('/rr-pins/:id', RED.auth.needsPermission('rr-gpio.read'), function(req,res) {
        res.json(pinsInUse);
    });

    if (initOK) {
        RED.log.info("rr-gpio : initialization complete.");
    } else {
        RED.log.warn("rr-gpio : "+RED._("RoadRunner specific node set inactive"));
    }
}

