console.clear()
json = require "json"

-- left is negative, right is positive
-- caps out at 14 without triggers, and 16 with triggers
addTurning = 0x0000D6

-- 1000 = 145km, 1500 = 253km, 2000 = 386km, 3000 = 722km
addSpeed = 0x000B20

-- max 2048, death if hit again when it's below 0
addPower = 0x0000C9

-- "Race finish state. Bitmask: lefcr--h
-- l = Race lost (ranked/timed out); e = Executing explosion animation (player); f = Crossed finish line; c = Camera is following CPU car; r = Show results; - = Unknown; h = Horizon moves with X coordinate instead of angle."
addState = 0x0000C3

-- Timer, centiseconds
addTimerCs = 0x0000C2

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

function updateState()
    return memory.readbyte(addState)
end

-- We're only concerned with the centiseconds, since we're only checking to see whether the timer is actually running
function updateTimer()
    return memory.readbyte(addTimerCs)
end

function updateVelocity()
    local speedVal = updateSpeed()
    local turnVal = updateTurn()
    local powerVal = updatePower()
    local stateVal = updateState()
    local timerVal = updateTimer()
    local packet = {speed=speedVal, turn=turnVal, power=powerVal, state=stateVal, timer=timerVal}
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