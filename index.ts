import {config} from 'dotenv';
import mqttClient from './src/mqttClient'
import httpServer from "./src/httpServer";
import {MapSelector, MqttStatusMessage, Unit, UnitStatus, Uuid} from "./src/types";
import winston, {Logger} from "winston";

config()

const ttl = parseInt(process.env.STATUS_TTL)

const timeoutMap: Map<Unit, Map<string, NodeJS.Timeout>> = new Map()

const mapSelector: MapSelector = {
    streamer: new Map(),
    relay: new Map(),
    node: new Map
}

function createServiceLogger(service: string): Logger {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        defaultMeta: { service },
        transports: [
            new winston.transports.Console(),
        ]
    });
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

function getUnitStatus(unit: Unit, uuid: Uuid): UnitStatus {
    const unitStatus = mapSelector[unit].get(uuid)
    if (!unitStatus) {
        return { status: 'offline' }
    }
    return unitStatus
}

function getUnitStatuses(unit: Unit, uuids: Uuid[]): Record<Uuid, UnitStatus> {
    return uuids.reduce((previousValue: Record<Uuid, UnitStatus> , currentValue: Uuid,) => {
        previousValue[currentValue] = mapSelector[unit].get(currentValue) || {status: 'offline'}
        return previousValue
    }, {})
}

httpServer(getUnitStatuses, createServiceLogger)
mqttClient(setStatus, setNewTimeout, getUnitStatus, createServiceLogger)
