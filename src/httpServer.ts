import fastify from 'fastify'
import {Logger} from 'winston';
import {BulkQuery, BulkResponse, Unit, UnitStatus, Uuid} from "./types";

export default function httpServer(getUnitStatuses: (unit: Unit, uuid: Uuid[]) => Record<Uuid, UnitStatus>, createServiceLogger: (service: string) => Logger) {
    const server = fastify()
    const port = parseInt(process.env.HTTP_PORT)
    const logger = createServiceLogger('Http Server')

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/streamer', (req, res) => {
        logger.info(`Http request for streamers`)
        const { uuids } = req.query
        const streamerStatuses = getUnitStatuses('streamer', Array.isArray(uuids) ? uuids : [uuids])
        res.code(200).send(streamerStatuses)
    })

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/relay', (req, res) => {
        logger.info(`Http request for relay`)
        const { uuids } = req.query
        const relayStatuses = getUnitStatuses('relay', Array.isArray(uuids) ? uuids : [uuids])
        res.code(200).send(relayStatuses)
    })

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/node', (req, res) => {
        logger.info(`Http request for nodes`)
        const { uuids } = req.query
        const relayStatuses = getUnitStatuses('node', Array.isArray(uuids) ? uuids : [uuids])
        res.code(200).send(relayStatuses)
    })

    server.listen({port, host: '0.0.0.0'}, () => {
        return logger.info(`Http server is listening at port ${port}`);
    });
}

