console.clear()
json = require "json"

-- left is negative, right is positive
-- caps out at 3584 without triggers, and 4096 with triggers
addTurning = 0x0000D5

-- 1000 = 145km, 1500 = 253km, 2000 = 386km, 3000 = 722km
addSpeed = 0x000B20

-- min 176, max 239
addPower = 0x000E23

local function sendData(data)
	packet = json.encode(data)
	comm.socketServerSend(packet)
end

function intToBool(value)
    if value > 0 then
        value = true;
    else
        value = false;
    end
    return value
end

function updateSpeed()
    return memory.readbyte(addSpeed)
end

function updateTurn()
    return memory.readbyte(addTurning)
end

function updatePower()
    return memory.readbyte(addPower)
end

function updateVelocity()
    local speedVal = updateSpeed()
    local turnVal = updateTurn()
    local powerVal = updatePower()
    local packet = {speed=speedVal, turn=turnVal, power=powerVal}
    sendData(packet)
end

while true do
    --if an address is changed too often, an event handler will slow down the game
    --so for those problematic addresses, we manually check those addresses every X number of frames
    local frame = emu.framecount()
    if frame % 10 == 0 then
        updateVelocity()
    end
    emu.frameadvance();
end