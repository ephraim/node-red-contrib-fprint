var fprint = require("node-fingerprint");

var initalized = fprint.init();
var deviceHandle = null;

function updateInitalizedStatus(node)
{
    if(initalized)
        node.status({fill:"green", shape:"dot", text:"initalized"});
    else
        node.status({fill:"red", shape:"ring", text:"uninitalized"});
}

module.exports = function(RED) {
    function fprint_enrollNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        updateInitalizedStatus(node);

        this.on('input', function(msg) {
            if(!initalized) {
                msg.payload = { result: false };
                node.send(null, msg);
            }

            if(!deviceHandle) {
                var devices = fprint.discoverDevices();
                deviceHandle = fprint.openDevice(devices[0]);
            }

            var stage = 1;
            var stages= fprint.getEnrollStages(deviceHandle);
            msg.payload = fprint.enroll(deviceHandle, function(state, message) {
                console.log("state: " + state + "; message: " + message)
                if(state == 3) {
                    console.log("stage " + stage++ + "/" + stages);
                }
            });

            console.log(msg.payload);
            if(msg.payload.result)
                node.send(msg, null);
            else
                node.send(null, msg);
        });
    }
    function fprint_verifyNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        updateInitalizedStatus(node);

        this.on('input', function(msg) {
            if(!initalized) {
                msg.payload = { result: false };
                node.send(null, msg);
            }

            if(!deviceHandle) {
                var devices = fprint.discoverDevices();
                deviceHandle = fprint.openDevice(devices[0]);
            }

            msg.payload = fprint.verify(deviceHandle, msg.payload.fingerprint, function(state, message) {
                console.log("state: " + state + "; message: " + message)
            });

            console.log(msg.payload);
            if(msg.payload)
                node.send(msg, null);
            else
                node.send(null, msg);
        });
    }
    function fprint_identifyNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        updateInitalizedStatus(node);

        this.on('input', function(msg) {
            if(!initalized) {
                msg.payload = { result: false };
                node.send(null, msg);
            }

            if(!deviceHandle) {
                var devices = fprint.discoverDevices();
                deviceHandle = fprint.openDevice(devices[0]);
            }

            msg.payload = fprint.identify(deviceHandle, msg.payload, function(state, message) {
                console.log("state: " + state + "; message: " + message)
            });

            console.log(msg.payload);
            if(msg.payload)
                node.send(msg, null);
            else
                node.send(null, msg);
        });
    }
    RED.nodes.registerType("FP-Enroll",   fprint_enrollNode);
    RED.nodes.registerType("FP-Verify",   fprint_verifyNode);
    RED.nodes.registerType("FP-Identify", fprint_identifyNode);
}
