import mqtt, {IClientOptions} from 'mqtt'
import {isUnit, MqttFleetStatusMessage, MqttStatusMessage, StreamerStatus, Unit, Uuid} from "./types";

function generateUuid(entity: string = ""): Uuid {
    return entity + '-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getUnitFromTopic(topic: string) : Unit {
    const topicParts = topic.split('/')
    const unit = topicParts[topicParts.indexOf('from') + 1]
    if(!isUnit(unit)) {
        return 'streamer'
    }
    return unit
}

export default function mqttClient(
    setStatus: (unit: Unit, statusMessage: MqttStatusMessage) => void,
    setNewTimeout: (unit: Unit, uuid: Uuid, callback: () => void) => void,
    getUnitStatus: (unit: Unit, uuid: Uuid) => StreamerStatus)
{
    const mqOptions: IClientOptions = {
        clientId: generateUuid(),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        protocolVersion: 5,
        rejectUnauthorized: true
    }
    const mqttClient = mqtt.connect(`${process.env.MQTT_URL}:${process.env.MQTT_PORT}`, mqOptions)
    const units = ['relay', 'streamer', 'node']

    mqttClient.on("connect", () => {
        console.log('connected to mqtt')
    });

    units.forEach((unit) => {
        mqttClient.subscribe(process.env.MQTT_TOPIC.replace('streamer', unit), { qos: 2 }, (error, ) => {
            if (error) {
                return console.log(error)
            }
            console.log(`subscribed to ${process.env.MQTT_TOPIC.replace('streamer', unit)}`)
        })
    })

    mqttClient.on('message', (topic, payload) => {
        const messageString = payload.toString()
        const statusMessage : MqttStatusMessage = JSON.parse(messageString)
        const {uuid, controllerNodePriority} = statusMessage
        const unit: Unit = getUnitFromTopic(topic)
        const currentStatus = getUnitStatus(unit, uuid)
        // const currentStatus = getStreamerStatus(uuid)
        if (currentStatus.status !== statusMessage.status) {
            console.log(`${unit} ${uuid} has changed to ${statusMessage.status}`)
            const fleetMessage: MqttFleetStatusMessage = {...statusMessage, type: 'streamer'}
            mqttClient.publish(process.env.MQTT_FLEET_TOPIC, JSON.stringify(fleetMessage))
        }
        setStatus(unit, statusMessage)
        setNewTimeout(unit, uuid, () => {
            const offlineMessage: MqttFleetStatusMessage = {uuid, controllerNodePriority, status: 'offline', type: 'streamer'}
            console.log(`${unit} ${uuid} has changed to ${statusMessage.status}`)
            mqttClient.publish(process.env.MQTT_FLEET_TOPIC, JSON.stringify(offlineMessage))
        })
    })
}
