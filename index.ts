import {config} from 'dotenv';
import mqtt from 'mqtt'
import express from 'express';

config()

const mqttClient = mqtt.connect(process.env.MQTT_URL, {username: process.env.MQTT_USERNAME, password: process.env.MQTT_PASSWORD});
const server = express();
const port = parseInt(process.env.HTTP_PORT)
const ttl = parseInt(process.env.STATUS_TTL)

type StreamerStatus = {
    status: string,
    timestamp: Date,
}

type StatusMessage = {
    uuid: string,
    status: string,
    controllerNodePriority?: number
}

const timeoutMap: Map<string, NodeJS.Timeout> = new Map()
const streamerMap : Map<string, StreamerStatus> = new Map()

function getOfflineStreamer() : StreamerStatus {
    return {
        status: 'offline', timestamp: new Date()
    }
}

mqttClient.on("connect", () => {
    console.log('connected to mqtt')
});

mqttClient.subscribe(process.env.MQTT_TOPIC, (error, ) => {
    if (error) {
        console.log('mqtt error')
    }
})

mqttClient.on('message', (topic, payload) => {
    const statusMessage : StatusMessage = JSON.parse(payload.toString())
    console.log('message received', statusMessage)
    const {uuid, status} = statusMessage
    const newStatus : StreamerStatus = {status, timestamp: new Date()}
    streamerMap.set(uuid, newStatus)
    if (status === 'offline') {
        return
    }
    const existingTimeout = timeoutMap.get(uuid)
    if(existingTimeout) {
        clearTimeout(existingTimeout)
    }
    const timeout = setTimeout(() => {
        console.log('expired', uuid)
        const controllerNodePriority =  statusMessage.controllerNodePriority
        mqttClient.publish(process.env.MQTT_TOPIC, JSON.stringify(controllerNodePriority ? {status: 'offline', uuid, controllerNodePriority } : {status: 'offline', uuid}))
    }, ttl)
    timeoutMap.set(uuid, timeout)
})

server.get('/:uuid', (req, res) => {
    const { uuid } = req.params
    const streamerStatus = streamerMap.get(uuid)
    if (!streamerStatus) {
        const offlineStatus = getOfflineStreamer()
        streamerMap.set(uuid, offlineStatus)
        res.json(offlineStatus)
    }
    res.json(streamerStatus)
});

server.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});