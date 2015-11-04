var fprint = require("node-fingerprint");

var initalized = fprint.init();

function updateInitalizedStatus(node, active)
{
    if(active)
        node.status({fill:"green", shape:"dot", text:"initalized"});
    else
        node.status({fill:"red", shape:"ring", text:"uninitalized"});
}

module.exports = function(RED) {
    function fprint_enrollNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.deviceHandle = null;

        this.on('input', function(msg) {
            node.log("entered");
            if(!initalized) {
                msg.payload = { result: false };
                node.send([null, msg, { payload: { state: 97, messsage: "fprint-not-initialized" } }]);
                return;
            }

            if(!node.deviceHandle) {
                if(config.device == "") {
                    var devices = fprint.discoverDevices();
                    config.device = devices[0];
                }
                node.deviceHandle = fprint.openDevice(config.device);
            }

            if(!node.deviceHandle) {
                msg.payload = { result: false };
                node.send([null, msg, { payload: { state: 98, messsage: "device-open-fail" } }]);
                return;
            }
            var stage = 1;
            var stages= fprint.getEnrollStages(node.deviceHandle);
            var ret = fprint.enrollStart(node.deviceHandle, function(state, message, fingerprint) {
                console.log("state: " + state + "; message: " + message)
                if(state > 3) {
                    console.log("closing down; cause error");
                    fprint.closeDevice(node.deviceHandle);
                    node.deviceHandle = null;
                    msg.payload = { result: false };
                    node.send([null, msg, { payload: { state: state, messsage: message, stage: stage, stages: stages } }]);
                    return;
                }

                stage++;

                if(state == 1 || state == 2) {
                    fprint.enrollStop(node.deviceHandle, function() {
                        fprint.closeDevice(node.deviceHandle);
                        node.deviceHandle = null;
                        if(state == 1) {
                            msg.payload = { result: true, fingerprint: fingerprint };
                            node.send([msg, null, { payload: { state: state, messsage: message } }]);
                        }
                        else {
                            msg.payload = { result: false };
                            node.send([null, msg, { payload: { state: state, messsage: message } }]);
                        }
                    });
                }
                else {
                    node.send([null, null, { payload: { state: state, messsage: message, stage: stage, stages: stages } }]);
                }
            });
            if(ret) {
                node.send([null, null, { payload: { state: 0, messsage: "enroll-started", stage: stage, stages: stages } }]);
            }
            else {
                node.send([null, null, { payload: { state: 99, messsage: "enroll-unknown-error", stage: stage, stages: stages } }]);
            }
        });
        this.on('close', function() {
            if(node.deviceHandle)
                fprint.enrollStop(node.deviceHandle, function() {
                    var tmp = node.deviceHandle;
                    fprint.closeDevice(node.deviceHandle);
                    node.deviceHandle = null;
                });
        });
    }
    function fprint_verifyNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.deviceHandle = null;

        this.on('input', function(msg) {
            node.log("entered");
            if(!initalized) {
                msg.payload = { result: false };
                node.send([null, msg, { payload: { state: 97, messsage: "fprint-not-initialized" } }]);
            }

            if(!node.deviceHandle) {
                if(config.device == "") {
                    var devices = fprint.discoverDevices();
                    config.device = devices[0];
                }
                node.deviceHandle = fprint.openDevice(config.device);
            }

            if(!node.deviceHandle) {
                msg.payload = { result: false };
                node.send([null, msg, { payload: { state: 98, messsage: "device-open-fail" } }]);
                return;
            }

            var ret = fprint.verifyStart(node.deviceHandle, msg.payload.fingerprint, function(state, message) {
                console.log("state: " + state + "; message: " + message)
                if(state == 0 || state == 1) {
                    fprint.verifyStop(node.deviceHandle, function() {
                        fprint.closeDevice(node.deviceHandle);
                        node.deviceHandle = null;
                        msg.payload = { result: true, matched: (state == 1) };
                        if(state == 1) {
                            node.send([msg, null, { payload: { state: state, messsage: message } }]);
                        }
                        else
                            node.send([null, msg, { payload: { state: state, messsage: message } }]);
                    });
                }
                else {
                    node.send([null, null, { payload: { state: state, messsage: message } }]);
                }
            });

            if(ret) {
                node.send([null, null, { payload: { state: 0, messsage: "verify-started" } }]);
            }
            else {
                node.send([null, null, { payload: { state: 99, messsage: "verify-unknown-error" } }]);
            }
        });
        this.on('close', function() {
            if(node.deviceHandle)
                fprint.verifyStop(node.deviceHandle, function() {
                    var tmp = node.deviceHandle;
                    fprint.closeDevice(node.deviceHandle);
                    node.deviceHandle = null;
                });
        });
    }
    function fprint_identifyNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.deviceHandle = null;

        this.on('input', function(msg) {
            node.log("entered");
            if(!initalized) {
                msg.payload = { result: false };
                node.send([null, msg, { payload: { state: 97, messsage: "fprint-not-initialized" } }]);
            }

            if(!node.deviceHandle) {
                if(config.device == "") {
                    var devices = fprint.discoverDevices();
                    config.device = devices[0];
                }
                node.deviceHandle = fprint.openDevice(config.device);
            }

            if(!node.deviceHandle) {
                msg.payload = { result: false };
                node.send([null, msg, { payload: { state: 98, messsage: "device-open-fail" } }]);
                return;
            }

            var ret = fprint.identifyStart(node.deviceHandle, msg.payload.fingerprints, function(state, message, matchedIndex) {
                console.log("state: " + state + "; message: " + message)
                if(state == 0 || state == 1) {
                    fprint.identifyStop(node.deviceHandle, function() {
                        fprint.closeDevice(node.deviceHandle);
                        node.deviceHandle = null;
                        msg.payload = { result: true, matched: false, matchedIndex: -1 };
                        if(state == 1) {
                            msg.payload.matched = true;
                            msg.payload.matchedIndex = matchedIndex;
                            node.send([msg, null, { payload: { state: state, messsage: message } }]);
                        }
                        else {
                            node.send([null, msg, { payload: { state: state, messsage: message } }]);
                        }
                    });
                }
                else {
                    node.send([null, null, { payload: { state: state, messsage: message } }]);
                }
            });

            if(ret) {
                node.send([null, null, { payload: { state: 0, messsage: "identify-started" } }]);
            }
            else {
                node.send([null, null, { payload: { state: 99, messsage: "identify-unknown-error" } }]);
            }
        });
        this.on('close', function() {
            if(node.deviceHandle)
                fprint.identifyStop(node.deviceHandle, function() {
                    fprint.closeDevice(node.deviceHandle);
                    node.deviceHandle = null;
                });
        });
    }
    RED.nodes.registerType("FP-Enroll",   fprint_enrollNode);
    RED.nodes.registerType("FP-Verify",   fprint_verifyNode);
    RED.nodes.registerType("FP-Identify", fprint_identifyNode);

    RED.httpAdmin.post("/fingerprint/devices", RED.auth.needsPermission("fingerprint.read"), function(req, res) {
        if(initalized) {
            var body = JSON.stringify(fprint.discoverDevices())
            res.writeHead(200, {
              'Content-Length': body.length,
              'Content-Type': 'text/json' });
            res.end(body);
        }
    });
}
