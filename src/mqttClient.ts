import mqtt, {IClientOptions} from 'mqtt'
import {isUnit, MqttFleetStatusMessage, MqttStatusMessage, StreamerStatus, Unit, Uuid} from "./types";
import {Logger} from "winston";

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
    getUnitStatus: (unit: Unit, uuid: Uuid) => StreamerStatus,
    createServiceLogger: (service: string) => Logger
) {
    const mqOptions: IClientOptions = {
        clientId: generateUuid(),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        protocolVersion: 5,
        rejectUnauthorized: true
    }
    const mqttClient = mqtt.connect(`${process.env.MQTT_URL}:${process.env.MQTT_PORT}`, mqOptions)
    const units = ['streamer']
    const logger = createServiceLogger('Mqtt Client')

    mqttClient.on("connect", () => {
        logger.info('connected to mqtt')
    });

    units.forEach((unit) => {
        mqttClient.subscribe(process.env.MQTT_TOPIC.replace('streamer', unit), { qos: 2 }, (error, ) => {
            if (error) {
                return logger.error(error)
            }
            logger.info(`subscribed to ${process.env.MQTT_TOPIC.replace('streamer', unit)}`)
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
            logger.info(`${unit} ${uuid} has changed to ${statusMessage.status}`)
            const fleetMessage: MqttFleetStatusMessage = {...statusMessage, type: unit}
            mqttClient.publish(process.env.MQTT_FLEET_TOPIC, JSON.stringify(fleetMessage))
        }
        setStatus(unit, statusMessage)
        setNewTimeout(unit, uuid, () => {
            const offlineMessage: MqttFleetStatusMessage = {uuid, controllerNodePriority, status: 'offline', type: unit}
            logger.info(`${unit} ${uuid} has changed to ${statusMessage.status}`)
            mqttClient.publish(process.env.MQTT_FLEET_TOPIC, JSON.stringify(offlineMessage))
        })
    })
}
