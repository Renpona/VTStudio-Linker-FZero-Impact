const Net = require('net');
const { damage } = require('./vts_modules/vtsConnector');
const emuPort = 34000;
const vtsConnection = require('./vts_modules/vtsConnector');

var gameState = {
    "timer": 0,
    "speed": 0,
    "turn": 0,
    "rank": 1,
    "power": 2048,
    "death": false,
    "damage": false,
    "raceActive": false
}

const normalTurnLimit = 14;
const maxTurnLimit = 16;

const server = Net.createServer();
server.listen(emuPort, function() {
    console.log(`Server listening for connection requests on socket localhost:${emuPort}`);
});

server.on('connection', function(socket) {
    console.log('A new connection has been established.');
    console.log('Socket state is ' + socket.readyState);

    vtsConnection.connect();
    
    socket.on('data', function(chunk) {
        //console.log(`Data received from client: \n${chunk.toString()}`);
        processChunk(chunk);
    });
    socket.on('drain', function() {
        console.log("data write completed");
    })
    socket.on('end', function() {
        console.log('Closing connection with the client');
    });
    socket.on('error', function(err) {
        console.log(`Error: ${err}`);
    });
});

function processChunk(chunk) {
    let data;
    try {
        data = JSON.parse(chunk);
    } catch (error) {
        console.log("ERROR combined packet recieved: " + chunk);
        return;
    }

    executeData(data)
}

var akari = new vtsConnection.Avatar();

function executeData(data) {
    data.turn = convertTurnValue(data.turn);
    data.damage = false;
    if (data.power < gameState.power) {
        data.damage = true;
    }

    // determine whether race is active
    if (data.timer == gameState.timer) {
        gameState.raceActive = false;
        gameState = data;
        return;
    }
    else {
        //akari.reset();
        gameState.raceActive = true;
    }

    // determine whether the vehicle's taken damage
    if (data.damage != gameState.damage) {
        //console.log("switchDamage " + data.damage);
        akari.shock(data.damage);
    }
    
    // determine whether power is below half
    if (akari.crying == false && data.power < 1024) {
        console.log("akari start crying");
        akari.cry(true);
    } else if (akari.crying == true && data.power >= 1024) {
        console.log("akari end crying");
        akari.cry(false);
    }

    //depends on whether the race is over
    if (data.state == 0b01000000 || data.state == 0b01000000 || data.state == 0b11000000) {
        akari.defeated();
    }

    if (data.rank < gameState.rank) {
        //player gained a rank
        console.log("rank up");
        akari.happy();
    } else if (data.rank > gameState.rank) {
        //player lost a rank
        console.log("rank down");
        akari.angry();
    }

    akari.turn(data.turn);

    gameState = data;
}

function convertTurnValue(turnValue) {   
    let turnPercent;
    if (turnValue == 0) {
        turnPercent = 0;
    } else {
        if (turnValue > 128) turnValue = turnValue - 256;
        turnPercent = turnValue / normalTurnLimit;
    }
    if (turnPercent > 1.2) turnPercent = 0;
    return turnPercent;
}
