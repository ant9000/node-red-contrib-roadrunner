module.exports = function(RED) {
    function GPIOInNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        node.on('input', function(msg) {
            msg.payload = 'TODO: rr-gpio in';
            node.send(msg);
        });
    }
    RED.nodes.registerType("rr-gpio in",GPIOInNode);

    function GPIOOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        node.on('input', function(msg) {
            msg.payload = 'TODO: rr-gpio out';
            node.send(msg);
        });
    }
    RED.nodes.registerType("rr-gpio out",GPIOOutNode);
}

