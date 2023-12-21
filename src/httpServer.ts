import express from 'express';
import {StreamerStatus} from "../index";
import bodyParser from "body-parser";

export default function httpServer(getStreamerStatus: (uuid: string) => StreamerStatus) {
    const server = express();
    const port = parseInt(process.env.HTTP_PORT)

    server.use(bodyParser.json())

    server.get('/:uuid', (req, res) => {
        const {uuid} = req.params
        const streamerStatus = getStreamerStatus(uuid)
        res.json(streamerStatus)
    });

    server.post('/bulk', (req, res) => {
        const uuids : string[] = req.body
        const streamerStatuses = uuids.map((uuid) => {
            return {uuid, ...getStreamerStatus(uuid)}
        })
        res.json(streamerStatuses)
    })

    server.listen(port, () => {
        return console.log(`Express is listening at http://localhost:${port}`);
    });
}

