module.exports = function(RED) {
    RED.log.info("rr-gpio : initializing.");

    function GPIOInNode(config) {
        RED.nodes.createNode(this,config);
        this.pin = config.pin; 
        var node = this;
        node.on('input', function(msg) {
            msg.payload = 'TODO: rr-gpio in ' + node.pin;
            node.send(msg);
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

