const WebSocketClient = require('websocket').client;
const utils = require('./utils');
const Auth = require('./auth');
const auth = new Auth();

const wsClient = new WebSocketClient();
const vtsPort = 8001;
var vtsConnection;

wsClient.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

wsClient.on('connect', function (connection) {
    vtsConnection = connection;
    console.log('WebSocket Client Connected');
    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function () {
        console.log('Connection Closed');
    });
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            //console.log('Received Message: ' + message.utf8Data);
            parseResponse(JSON.parse(message.utf8Data), connection);
        }
    });
    connection.send(auth.requestToken("Renpona", "Mu Linker Project - M1"));
});

function parseResponse(response, connection) {
    //console.log(response);
    if (!auth.token) {
        auth.token = response.data.authenticationToken;
        connection.send(auth.tokenAuth());
    }
    /*else if (response.messageType == "AuthenticationResponse" && response.data.authenticated == true) {
        powerup(0);
    }*/
}

/* TODO:
    Shuffle off most of these request builders to a separate file
    The artmesh IDs should be read from a JSON file or something instead of hardcoded like this
    Probably should also put the game-specific stuff in a separate file
    This will probably be part of a larger project-wide code reorganization necessary for user customization support
*/
class Colors {
    constructor(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
}

const hairColor = ["ArtMesh1", "ArtMesh2", "ArtMesh5", "ArtMesh6", "ArtMesh7", "ArtMesh8"];
const eyeColor = ["ArtMesh25", "ArtMesh31"];
function recolorMesh(color, mesh, rainbow = false, tintAll = false) {
    let data = {
        "colorTint": {
            "colorR": color.red,
            "colorG": color.green,
            "colorB": color.blue,
            "colorA": color.alpha
        }
    }
    if (tintAll == true) {
        data.artMeshMatcher = {"tintAll": tintAll};
    } else {
        data.artMeshMatcher = {"nameExact": mesh};
    }
    if (rainbow == true) data.colorTint.jeb_ = true;
    
    let request = utils.buildRequest("ColorTintRequest", data);
    vtsConnection.send(request);
}

class MoveResizeRotate {
    constructor(time = 0.5, relative = false) {
        this.timeInSeconds = time;
        this.valuesAreRelativeToModel = relative;
    }
    move(x, y) {
        this.positionX = x;
        this.positionY = y;
    }
    resize(size) {
        this.size = size;
    }
    rotate(rotation) {
        this.rotation = rotation;
    }
    send() {
        let request = utils.buildRequest("MoveModelRequest", this);
        vtsConnection.send(request);
    }
}

function runHotkey(hotkeyId) {
    let data = {
        "hotkeyID": hotkeyId
    }
    let request = utils.buildRequest("HotkeyTriggerRequest", data);
    vtsConnection.send(request);
}

function createParamValue(id, value, weight = null) {
    let param = {
        "id": id,
        "value": value
    }
    if (weight) param.weight = weight;
    return param;
}

class Avatar {
    shockId = "2848d9924f1542098dc3a42316fca14b";
    cryId = "19dfc88d28ec4902a18731bc90c40765";
    shockAnimId = "1b1be728c25541f0b9c0d89a38c48dee";

    shocked = false;
    crying = false;
    animating = false;
    lossAnimation = false;
    turnHead = 0;
    turnBody = 0;

    constructor() {
        this.reset()
    }
    reset() {
        this.shock(false);
        this.cry(false);
        this.animating = false;
        this.lossAnimation = false;
        this.turnHead = 0;
        this.turnBody = 0;
    }
    shock(bool) {
        if (this.shocked != bool) {
            this.shocked = bool;
            vtsConnection.runHotkey(this.shockId);
        }
    }
    cry(bool) {
        if (this.crying != bool) {
            this.crying = bool;
            vtsConnection.runHotkey(this.cryId);
        }
    }
    defeated() {
        if (this.animating == false) {
            this.animating = true;
            vtsConnection.runHotkey(this.shockAnimId);
            console.log("start animation flag");
            setTimeout(2000, this.clearAnimation);
        }
    }
    clearAnimation() {
        console.log("animation flag cleared");
        this.animating = false;
    }
}

function connectToVts() {
    wsClient.connect('ws://localhost:' + vtsPort);
}

module.exports = {
    connection: vtsConnection,
    runHotkey: runHotkey,
    Avatar: Avatar,
    connect: connectToVts
};
