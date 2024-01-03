import mqtt, {IClientOptions} from 'mqtt'
import {StreamerStatus} from "../index";
import {subscribe} from "diagnostics_channel";

export type StatusMessage = {
    uuid: string,
    status: string,
    controllerNodePriority?: number
}

type FleetStatusMessage = StatusMessage & {
    type: 'streamer' | 'relay' | 'node'
}

function generateUuid(entity: string = ""): string {
    return entity + '-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function mqttClient(
    setStatus: (statusMessage: StatusMessage) => void,
    setNewTimeout: (uuid: string, callback: () => void) => void,
    getStreamerStatus: (uuid: string) => StreamerStatus)
{
    const mqOptions: IClientOptions = {
        clientId: generateUuid(),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        protocolVersion: 5,
        rejectUnauthorized: true
    }
    const mqttClient = mqtt.connect(`${process.env.MQTT_URL}:${process.env.MQTT_PORT}`, mqOptions)

    mqttClient.on("connect", () => {
        console.log('connected to mqtt')
    });

    mqttClient.subscribe(process.env.MQTT_TOPIC, { qos: 2 }, (error, ) => {
        if (error) {
            console.log(error)
            return
        }
        console.log(`subscribed to ${process.env.MQTT_TOPIC}`)
    })

    mqttClient.on('message', (topic, payload) => {
        const messageString = payload.toString()
        const statusMessage : StatusMessage = JSON.parse(messageString)
        const {uuid, controllerNodePriority} = statusMessage
        const currentStatus = getStreamerStatus(uuid)
        if (currentStatus.status !== statusMessage.status) {
            console.log(`new status received for ${uuid}`, statusMessage)
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
