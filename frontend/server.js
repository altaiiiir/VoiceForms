const {createReadStream} = require("fs");

const WebSocket = require('ws');
const {TranscribeStreamingClient, StartStreamTranscriptionCommand} = require('@aws-sdk/client-transcribe-streaming');
const {PassThrough} = require('stream');

const wss = new WebSocket.Server({port: 8080});

const {join} = require("path");

const audio = createReadStream(join(__dirname, "recorded_audio.webm"), { highWaterMark: 1024 * 16});


wss.on('connection', async (ws) => {
    console.log('Client connected');

    const audioStream = new PassThrough();

    const transcribeClient = new TranscribeStreamingClient({
        region: 'us-west-2'
    });

    const params = {
        LanguageCode: 'en-US',
        MediaSampleRateHertz: 48000,
        // MediaEncoding: 'ogg-opus',
        MediaEncoding: 'pcm',
        AudioStream: (async function* () {
            for await (const chunk of audioStream) {
                yield {AudioEvent: {AudioChunk: chunk}};
            }
        })(),
    };

    const command = new StartStreamTranscriptionCommand(params);


    const transcribeStream = await transcribeClient.send(command);


    ws.on('message', (message) => {
        // console.log('Received message on WS');
        // console.log(message)
        // ws.send('Hello from server!');
        audioStream.write(message);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    for await (const event of transcribeStream.TranscriptResultStream) {
        // console.log('AWS Transcribed: ', JSON.stringify(event));
        console.log('AWS Transcribed: ',  event);
    }
});

console.log('WebSocket server started on ws://localhost:8080');