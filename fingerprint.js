var fprint = require("node-fprint");

var initalized = fprint.init();

function updateInitalizedStatus(node, active)
{
    if(active)
        node.status({fill:"green", shape:"dot", text:"initalized"});
    else
        node.status({fill:"red", shape:"ring", text:"uninitalized"});
}

function sendResult(msg, state)
{
    this.sendState(state);
    this.sendMessage(msg);
}

function sendState(state)
{
    this.send([null, null, { payload: state }]);
}

function sendMessage(msg)
{
    if(msg.payload.result)
        this.send([msg, null, null]);
    else
        this.send([null, msg, null]);
}

module.exports = function(RED) {
    function fprint_enrollNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.deviceHandle = null;
        node.sendResult = sendResult;
        node.sendState = sendState;
        node.sendMessage = sendMessage;

        this.on('input', function(msg) {
            if(typeof msg.payload != "object")
				msg.payload = {};

            if(!initalized) {
                msg.payload.result = false;
                node.sendResult(msg, { state: 97, message: "fprint-not-initialized" });
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
                msg.payload.result = false;
                node.sendResult(msg, { payload: { state: 98, message: "device-open-fail" } });
                return;
            }
            var stage = 1;
            var stages= fprint.getEnrollStages(node.deviceHandle);
            var ret = fprint.enrollStart(node.deviceHandle, function(state, message, fingerprint) {
                if(state > 3) {
                    fprint.closeDevice(node.deviceHandle);
                    node.deviceHandle = null;
                    msg.payload.result = false;
                    node.sendResult(msg, { payload: { state: state, message: message, stage: stage, stages: stages } });
                    return;
                }

                stage++;

                if(state == 1 || state == 2) {
                    fprint.enrollStop(node.deviceHandle, function() {
                        fprint.closeDevice(node.deviceHandle);
                        node.deviceHandle = null;
                        msg.payload.result = (state == 1);
                        if(msg.payload.result)
                            msg.payload.fingerprint = fingerprint;

                        node.sendResult(msg, { payload: { state: state, message: message } });
                    });
                }
                else {
                    node.sendState({ state: state, message: message, stage: stage, stages: stages });
                }
            });
            if(ret) {
                node.sendState({ state: 0, message: "enroll-started", stage: stage, stages: stages });
            }
            else {
                node.sendState({ state: 99, message: "enroll-unknown-error", stage: stage, stages: stages });
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
        node.sendResult = sendResult;
        node.sendState = sendState;
        node.sendMessage = sendMessage;

        this.on('input', function(msg) {
            if(typeof msg.payload != "object")
				msg.payload = {};

            if(!initalized) {
                msg.payload.result = false;
                node.sendResult(msg, { state: 97, message: "fprint-not-initialized" });
            }

            if(!node.deviceHandle) {
                if(config.device == "") {
                    var devices = fprint.discoverDevices();
                    config.device = devices[0];
                }
                node.deviceHandle = fprint.openDevice(config.device);
            }

            if(!node.deviceHandle) {
                msg.payload.result = false;
                node.sendResult(msg, { payload: { state: 98, message: "device-open-fail" } });
                return;
            }

            var ret = fprint.verifyStart(node.deviceHandle, msg.payload.fingerprint, function(state, message) {
                if(state == 0 || state == 1) {
                    fprint.verifyStop(node.deviceHandle, function() {
                        fprint.closeDevice(node.deviceHandle);
                        node.deviceHandle = null;
                        msg.payload.result = (state == 1);
                        node.sendResult(msg, { payload: { state: state, message: message } });
                    });
                }
                else {
                    node.sendState({ state: state, message: message });
                }
            });

            if(ret) {
                node.sendState({ state: 0, message: "verify-started" });
            }
            else {
                node.sendState({ state: 99, message: "verify-unknown-error" });
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
        node.sendResult = sendResult;
        node.sendState = sendState;
        node.sendMessage = sendMessage;

        this.on('input', function(msg) {
            if(typeof msg.payload != "object")
				msg.payload = {};

            if(!initalized) {
                msg.payload.result = false;
                node.sendResult(msg, { state: 97, message: "fprint-not-initialized" });
            }

            if(!node.deviceHandle) {
                if(config.device == "") {
                    var devices = fprint.discoverDevices();
                    config.device = devices[0];
                }
                node.deviceHandle = fprint.openDevice(config.device);
            }

            if(!node.deviceHandle) {
                msg.payload.result = false;
                node.sendResult(msg, { payload: { state: 98, message: "device-open-fail" } });
                return;
            }

            var ret = fprint.identifyStart(node.deviceHandle, msg.payload.fingerprints, function(state, message, matchedIndex) {
                if(state == 0 || state == 1) {
                    fprint.identifyStop(node.deviceHandle, function() {
                        fprint.closeDevice(node.deviceHandle);
                        node.deviceHandle = null;
                        msg.payload.result = (state == 1);
                        msg.payload.matchedIndex= -1;
                        if(msg.payload.result)
                            msg.payload.matchedIndex = matchedIndex;

                        node.sendResult(msg, { payload: { state: state, message: message } });
                    });
                }
                else {
                    node.sendState({ state: state, message: message });
                }
            });

            if(ret) {
                node.sendState({ state: 0, message: "identify-started" });
            }
            else {
                node.sendState({ state: 99, message: "identify-unknown-error" });
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
