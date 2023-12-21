import mqtt from 'mqtt'
import {StreamerStatus} from "../index";

export type StatusMessage = {
    uuid: string,
    status: string,
    controllerNodePriority?: number
}

type FleetStatusMessage = StatusMessage & {
    type: 'streamer' | 'relay' | 'node'
}

export default function mqttClient(
    setStatus: (statusMessage: StatusMessage) => void,
    setNewTimeout: (uuid: string, callback: () => void) => void,
    getStreamerStatus: (uuid: string) => StreamerStatus)
{
    const mqttClient = mqtt.connect(process.env.MQTT_URL, {username: process.env.MQTT_USERNAME, password: process.env.MQTT_PASSWORD});

    mqttClient.on("connect", () => {
        console.log('connected to mqtt')
    });

    mqttClient.subscribe(process.env.MQTT_TOPIC, (error, ) => {
        if (error) {
            console.log('mqtt error')
        }
    })

    mqttClient.on('message', (topic, payload) => {
        const messageString = payload.toString()
        const statusMessage : StatusMessage = JSON.parse(messageString)
        console.log('message received', statusMessage)
        const {uuid, controllerNodePriority} = statusMessage
        const currentStatus = getStreamerStatus(uuid)
        if (currentStatus.status !== statusMessage.status) {
            const fleetMessage: FleetStatusMessage = {...statusMessage, type: 'streamer'}
            mqttClient.publish(process.env.MQTT_FLEET_TOPIC, JSON.stringify(fleetMessage))
        }
        setStatus(statusMessage)
        setNewTimeout(uuid, () => {
            const offlineMessage: FleetStatusMessage = {uuid, controllerNodePriority, status: 'offline', type: 'streamer'}
            mqttClient.publish(process.env.MQTT_FLEET_TOPIC, JSON.stringify(offlineMessage))
        })
    })
}
