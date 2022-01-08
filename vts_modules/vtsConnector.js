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
    if (!auth.token) {
        auth.token = response.data.authenticationToken;
        connection.send(auth.tokenAuth());
    }
    //console.log(response.data);
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
    //TODO: add to constructor, make them take passed values
    shockId = "65ee6a7e5b094ff6a52cca162d418591";
    cryId = "e68cbd4bdd8442c9ab12f0d70a45bce2";
    shockAnimId = "edfb42d82e57468fa4e049d624175d61";
    heartId = "20cab75892c644839fef92bacc3533f3";
    angryId = "8ae1315c5b9047568b35b7c176e60868";

    headTurnParam = "FaceAngleX";
    bodyTurnParam = "FaceAngleZ";

    shocked = false;
    crying = false;
    heartEyes = false;
    angryMark = false;
    animating = false;
    lossAnimation = false;
    turnHead = 0;
    turnBody = 0;

    constructor() {
        this.reset()
    }
    turn(percentage) {
        if (Math.abs(percentage) > 1) {
            this.turnHead = Math.sign(percentage) * 30;
            this.turnBody = (percentage - Math.sign(percentage)) * 120;
        } else {
            this.turnHead = percentage * 30;
            this.turnBody = 0;
        }
        
        //TODO: do this better
        let paramArray = [];
        paramArray.push(createParamValue(this.headTurnParam, this.turnHead, 0.8));
        
        //don't send body move requests if they're not needed, hand things back to the tracker
        if (Math.abs(this.turnBody) > 0) {
            paramArray.push(createParamValue(this.bodyTurnParam, this.turnBody, 0.7));
        }
        let request = utils.buildRequest("InjectParameterDataRequest", {"parameterValues": paramArray});
        vtsConnection.send(request);
    }
    reset() {
        this.shock(false);
        this.cry(false);
        this.heartEyes;
        this.angryMark;
        this.animating = false;
        this.lossAnimation = false;
        this.turnHead = 0;
        this.turnBody = 0;
    }
    shock(bool) {
        if (this.shocked != bool) {
            this.shocked = bool;
            runHotkey(this.shockId);
        }
    }
    cry(bool) {
        if (this.crying != bool) {
            this.crying = bool;
            runHotkey(this.cryId);
        }
    }
    happy() {
        console.log("happy");
        if (this.heartEyes == false && this.angryMark == false) {
            console.log("happy check passed");
            this.heartEyes = true;
            runHotkey(this.heartId);
            setTimeout(this.clearExpression, 1000, this, this.heartId, "heartEyes");
        }
    }
    angry() {
        if (this.heartEyes == false && this.angryMark == false) {
            this.angryMark = true;
            runHotkey(this.angryId);
            setTimeout(this.clearExpression, 1000, this, this.angryId, "angryMark");
        }
    }
    clearExpression(avatar, hotkey, flag) {
        console.log("clear expression");
        avatar[flag] = false;
        runHotkey(hotkey);
    }
    defeated() {
        if (this.animating == false) {
            this.animating = true;
            runHotkey(this.shockAnimId);
            console.log("start animation flag");
            setTimeout(clearAnimation, 2000, this);
        }
    }
}

function clearAnimation(target) {
    console.log("animation flag cleared");
    target.animating = false;
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
