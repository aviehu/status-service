import {config} from 'dotenv';
import mqttClient, {StatusMessage} from './src/mqttClient'
import httpServer from "./src/httpServer";

config()

const ttl = parseInt(process.env.STATUS_TTL)

export type StreamerStatus = {
    status: string,
    timestamp: Date,
    controllerNodePriority?: number
}

const timeoutMap: Map<string, NodeJS.Timeout> = new Map()
const streamerMap : Map<string, StreamerStatus> = new Map()

function setStatus(statusMessage: StatusMessage) {
    const {status, controllerNodePriority,uuid} = statusMessage
    streamerMap.set(uuid, {status, controllerNodePriority, timestamp: new Date()})
}

function setNewTimeout(uuid: string, callback: () => void) {
    const existingTimeout = timeoutMap.get(uuid)
    if(existingTimeout) {
        clearTimeout(existingTimeout)
    }
    const timeout = setTimeout(() => {
        const oldStatus = streamerMap.get(uuid)
        const offlineStatus: StreamerStatus = {...oldStatus, status: 'offline'}
        streamerMap.set(uuid, offlineStatus)
        callback()
    }, ttl)
    timeoutMap.set(uuid, timeout)
}

function getStreamerStatus(uuid: string): StreamerStatus {
    const streamerStatus = streamerMap.get(uuid)
    if (!streamerStatus) {
        const offlineStatus = { status: 'offline', timestamp: new Date() }
        streamerMap.set(uuid, offlineStatus)
        return offlineStatus
    }
    return streamerStatus
}

httpServer(getStreamerStatus)
mqttClient(setStatus, setNewTimeout, getStreamerStatus)
