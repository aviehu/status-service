import fastify from 'fastify'
import {BulkQuery, BulkResponse, Unit, UnitStatus, Uuid} from "./types";

export default function httpServer(getUnitStatuses: (unit: Unit, uuid: Uuid[]) => Record<Uuid, UnitStatus>) {
    const server = fastify()
    const port = parseInt(process.env.HTTP_PORT)

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/streamer', (req, res) => {
        console.log('streamer request')
        const { uuids } = req.query
        const streamerStatuses = getUnitStatuses('streamer', Array.isArray(uuids) ? uuids : [uuids])
        res.code(200).send(streamerStatuses)
    })

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/relay', (req, res) => {
        const { uuids } = req.query
        const relayStatuses = getUnitStatuses('relay', Array.isArray(uuids) ? uuids : [uuids])
        res.code(200).send(relayStatuses)
    })

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/node', (req, res) => {
        const { uuids } = req.query
        const relayStatuses = getUnitStatuses('node', Array.isArray(uuids) ? uuids : [uuids])
        res.code(200).send(relayStatuses)
    })

    server.listen({port, host: '0.0.0.0'}, () => {
        return console.log(`Http server is listening at port ${port}`);
    });
}

