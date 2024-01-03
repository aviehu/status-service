export type Unit = 'streamer' | 'relay' | 'node'

export type BaseStatus = {
    status: string,
    timestamp?: Date
}

export type StreamerStatus = BaseStatus & {
    controllerNodePriority?: number
}

export type RelayStatus = BaseStatus & {
    controllerNodePriority?: number
}

export type NodeStatus = BaseStatus

export type UnitStatus = RelayStatus | StreamerStatus | NodeStatus

export type MapSelector = {
    streamer: Map<string, StreamerStatus>,
    relay: Map<string, RelayStatus>
    node: Map<string, NodeStatus>
}

export type MqttStatusMessage = {
    uuid: string,
    status: string,
    controllerNodePriority?: number
}

export type MqttFleetStatusMessage = MqttStatusMessage & {
    type: Unit
}

export type BulkResponse = {200: Record<string, UnitStatus>}

export type BulkQuery = { uuids: string[]}

export type Uuid = string

export function isUnit(unit: string): unit is Unit {
    return ['streamer', 'relay', 'node'].includes(unit)
}