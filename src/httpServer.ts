import {StreamerStatus} from "../index";
import fastify from 'fastify'

type BulkResponse = {200: Record<string, StreamerStatus>}
type BulkQuery = { uuids: string[]}
export default function httpServer(getStreamerStatuses: (uuid: string[]) => Record<string,StreamerStatus>) {
    const server = fastify()
    const port = parseInt(process.env.HTTP_PORT)

    server.get<{Querystring: BulkQuery, Reply: BulkResponse}>('/', (req, res) => {
        const { uuids } = req.query
        const streamerStatuses = getStreamerStatuses(uuids)
        console.log(streamerStatuses)
        res.code(200).send(streamerStatuses)
    })

    server.listen({port, host: '0.0.0.0'}, () => {
        return console.log(`Http server is listening at port ${port}`);
    });
}

