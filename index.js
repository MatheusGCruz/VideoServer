const express = require('express')
const fs = require('fs')
const cors = require('cors')
const { execFile, spawn } = require('child_process')
const path = require('path')

const app = express()

const VIDEOS_PATH = process.env.VIDEOS_PATH || 'E:/VideoServer'
const PORT = process.env.PORT || 3017

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
    const filename = path.basename(req.params.filename)
    const filePath = path.join(VIDEOS_PATH, filename)

    if (!filename || filename === 'null') {
        return res.status(404).send('Not Found')
    }

    const audio = Number(req.query.audio || 1)
    const subtitle = req.query.subtitle !== undefined ? Number(req.query.subtitle) : -1

    const args = [
        '-i', filePath,
        '-map', '0:v:0',
        '-map', `0:${audio}`,
        '-c:a', 'aac',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4'
    ]

    if (subtitle >= 0) {
        const safePath = filePath.replace(/\\/g, '/').replace(/:/g, '\\:')
        args.push('-vf', `subtitles='${safePath}':si=0`, '-c:v', 'libx264', '-preset', 'veryfast')
    } else {
        args.push('-c:v', 'copy')
    }

    args.push('pipe:1')

    res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*'
    })

    const ffmpeg = spawn('ffmpeg', args)
    ffmpeg.stdout.pipe(res)
    ffmpeg.stderr.on('data', (data) => console.error(data.toString()))
    res.on('close', () => ffmpeg.kill('SIGKILL'))
})

app.get('/files', cors(), (req, res) => {
    const files = fs.readdirSync(VIDEOS_PATH + "/");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
    return res.send(files);
})

app.get('/tracks/:filename', cors(), (req, res) => {
    const filename = path.basename(req.params.filename)
    const filePath = path.join(VIDEOS_PATH, filename)

    if (!filename || filename === 'null') {
        return res.status(404).json({ audio: [], subtitles: [] })
    }

    execFile('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        filePath
    ], (error, stdout) => {
        if (error) return res.status(500).json({ audio: [], subtitles: [] })

        let streams = []

        try {
            streams = JSON.parse(stdout).streams || []
        } catch {
            return res.status(500).json({ audio: [], subtitles: [] })
        }

        res.json({
            audio: streams
                .filter((s) => s.codec_type === 'audio')
                .map((s, i) => ({
                    index: s.index,
                    label: s.tags?.title || s.tags?.language || `Audio ${i + 1}`,
                    language: s.tags?.language
                })),
            subtitles: streams
                .filter((s) => s.codec_type === 'subtitle')
                .map((s, i) => ({
                    index: s.index,
                    label: s.tags?.title || s.tags?.language || `Subtitle ${i + 1}`,
                    language: s.tags?.language
                }))
        })
    })
})

app.listen(PORT, () => {
    console.log('video server started on port ' + PORT);
})
