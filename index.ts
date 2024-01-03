import {config} from 'dotenv';
import mqttClient from './src/mqttClient'
import httpServer from "./src/httpServer";
import {MapSelector, MqttStatusMessage, Unit, UnitStatus, Uuid} from "./src/types";

config()

const ttl = parseInt(process.env.STATUS_TTL)

const timeoutMap: Map<Unit, Map<string, NodeJS.Timeout>> = new Map()

const mapSelector: MapSelector = {
    streamer: new Map(),
    relay: new Map(),
    node: new Map
}

function setStatus(unit: Unit, statusMessage: MqttStatusMessage) {
    const {status, controllerNodePriority,uuid} = statusMessage
    mapSelector[unit].set(uuid, {status, timestamp: new Date(), controllerNodePriority})
}

function setNewTimeout(unit:Unit, uuid: Uuid, callback: () => void) {
    const unitMap = timeoutMap.get(unit)
    if(!unitMap) {
        timeoutMap.set(unit, new Map())
    }
    const existingTimeout = timeoutMap.get(unit).get(uuid)
    if(existingTimeout) {
        clearTimeout(existingTimeout)
    }
    const timeout = setTimeout(() => {
        mapSelector[unit].delete(uuid)
        callback()
    }, ttl)
    timeoutMap.get(unit).set(uuid, timeout)
}

function getUnitStatus(unit: Unit, uuid: string): UnitStatus {
    const unitStatus = mapSelector[unit].get(uuid)
    if (!unitStatus) {
        return { status: 'offline' }
    }
    return unitStatus
}

function getUnitStatuses(unit: Unit, uuids: string[]): Record<string, UnitStatus> {
    return uuids.reduce((previousValue: Record<string, UnitStatus> , currentValue: string,) => {
        previousValue[currentValue] = mapSelector[unit].get(currentValue) || {status: 'offline'}
        return previousValue
    }, {})
}


setInterval(() => {
    console.log('streamers', mapSelector.streamer)
    console.log('relay', mapSelector.relay)
    console.log('node', mapSelector.node)
}, 10000)
httpServer(getUnitStatuses)
mqttClient(setStatus, setNewTimeout, getUnitStatus)
