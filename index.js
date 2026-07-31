const express = require('express')
const fs = require('fs')
const cors = require('cors')

const app = express()

const VIDEOS_PATH = process.env.VIDEOS_PATH || 'E:/VideoServer'
const PORT = process.env.PORT || 3018

app.get('/mp4/:filename', cors(), (req, res) => {
    const filename = req.params.filename;
    const filePath = VIDEOS_PATH + "/" + filename;
    if (!filename || filename === 'null') {
        return res.status(404).send('Not Found')
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4'
        }
        res.writeHead(206, head);
        file.pipe(res);
    }
    else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4'
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
})

app.get('/mkv/:filename', cors(), (req, res) => {
    const filename = req.params.filename;
    const filePath = VIDEOS_PATH + "/" + filename;
    if (!filename || filename === 'null') {
        return res.status(404).send('Not Found')
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/x-matroska'
        }
        res.writeHead(206, head);
        file.pipe(res);
    }
    else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/x-matroska'
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
})

app.get('/files', cors(), (req, res) => {
    const files = fs.readdirSync(VIDEOS_PATH + "/");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
    return res.send(files);
})

app.listen(PORT, () => {
    console.log('video server started on port ' + PORT);
})
