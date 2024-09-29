import {StartStreamTranscriptionCommand, TranscribeStreamingClient,} from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";
import {Buffer} from "buffer";

let microphoneStream = undefined;
const language = "en-US";
const SAMPLE_RATE = 48000;
let transcribeClient = undefined;

const createMicrophoneStream = async () => {
    microphoneStream = new MicrophoneStream();
    microphoneStream.setStream(
        await window.navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        })
    );
};

const encodePCMChunk = (chunk) => {
    const input = MicrophoneStream.toRaw(chunk);
    let offset = 0;
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return Buffer.from(buffer);
};

const getAudioStream = async function* () {
    for await (const chunk of microphoneStream) {
        if (chunk.length <= SAMPLE_RATE) {
            yield {
                AudioEvent: {
                    AudioChunk: encodePCMChunk(chunk),
                },
            };
        }
    }
};

const startStreaming = async (language, callback) => {
    const command = new StartStreamTranscriptionCommand({
        LanguageCode: language,
        MediaEncoding: "pcm",
        MediaSampleRateHertz: SAMPLE_RATE,
        AudioStream: getAudioStream(),
        ShowSpeakerLabel: true,
        EnablePartialResultsStabilization: true,
        PartialResultsStability: 'medium',
    });
    const data = await transcribeClient.send(command);
    for await (const event of data.TranscriptResultStream) {
        const results = event.TranscriptEvent.Transcript.Results;
        if (results.length && !results[0]?.IsPartial) {
            // console.log('Results: ', results)
            const newTranscript = results[0].Alternatives[0].Transcript;
            console.log(newTranscript);
            callback(newTranscript + " ");
        }
    }
};

const startRecording = async (callback) => {

    if (microphoneStream || transcribeClient) {
        stopRecording();
    }
    createTranscribeClient();
    createMicrophoneStream();
    await startStreaming(language, callback);
};

const createTranscribeClient = () => {
    transcribeClient = new TranscribeStreamingClient({
        region: 'us-west-2',
        credentials: {
            accessKeyId: 'ASIAVZI3N25247CFELPS',
            secretAccessKey: 'pAwBiKAsqJNSmtkGvG/sMKiPyEGZrkEEzleL52Jv',
            sessionToken: 'IQoJb3JpZ2luX2VjEAUaCXVzLWVhc3QtMSJHMEUCIQD9kWxM0iX282z6G16dcYZmp2A8dpa+33u40xEQej7sLwIgL0qZ+RSpAvwKviHQdESP4uDWfAkvdTQ74LZv6rPoO1IqmQIIThACGgwzOTc4Nzg4NzYwMjEiDHpSstR8F2yi/8SbPCr2AUjzTgFqtQmy+B0AYU/t5sdjVYBPTVTN8g4gywt12vd6RECn8GtZGz846rZbbcmuRcREsFDo8LMaSDUt8QHX137LMBKBewoTWsvycMVncJr0LJ7V2ZQQ30U6YIc+5vr9aNNwZEZfMgyahlATd6dWMNqjlDVpxvxMa2BlumMtkqonMLDCaQnOzYLOtMJ0u0GlIW3PdHOiarCrlioWbh0YK0u10wVgKO3jT5HbSHxllv7d8HedM5pQUPpZkRAqkfT/AdiJqtK6kQ9sHXgQMUM3zeZeS1Z3//0h37FGqrZw/N7PGzUgFGH2kB5IbN2Wwg2tbO+FinJR9zDX2uG3BjqdAdCWcy1Ti5Qy4wQIp+cITXBFYJR7w25q9pi+eQMpxcKRaIwjCn7oI45KP1CWVI6b1NXB2Ry2+HRsgiLNikSqtO1yrZiACpuEhcKQWnpQT0d89jmIfsgwa12KraYtFLscG7K8ve0Qswt7bE8lAOJ/OXP7LhTi7iuWefn05WuD+nptearbljpLb4kHfI2Eor4a5l90wonPwYZ5ncvHqro='
        },
    });
};

const stopRecording = function () {
    if (microphoneStream) {
        microphoneStream.stop();
        microphoneStream.destroy();
        microphoneStream = undefined;
    }
};

// === FRONTEND ===
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const transcriptionDiv = document.getElementById("transcription");

const toggleRecordingButton = document.getElementById("toggleRecordingButton");
let recordingNow = false;

let transcription = "";

const toggleRecording = async () => {
    console.log("toggleRecording: RecordingNow is" + recordingNow);
    if (recordingNow) {
        console.log("toggleRecording - stopping");
        stopButtonAction();
        console.log("toggleRecording - stopping after");
        toggleRecordingButton.textContent = "Start Listening";
    } else {
        console.log("toggleRecording - starting");
        toggleRecordingButton.textContent = "Stop Listening";
        startButtonAction().then(() => {console.log("toggleRecording - starting then")});
        console.log("toggleRecording - starting after");
    }
    recordingNow = !recordingNow;
}

toggleRecordingButton.addEventListener("click", toggleRecording);

const startButtonAction = async () => {
    await startRecording((text) => {
        transcription += text;
        transcriptionDiv.innerHTML = transcription;
    });
}

const stopButtonAction = () => {
    stopRecording();
    transcription = "";
    transcriptionDiv.innerHTML = "";
}

// startButton.addEventListener("click", async () => {
//     await startRecording((text) => {
//         transcription += text;
//         transcriptionDiv.innerHTML = transcription;
//     });
// });
//
// stopButton.addEventListener("click", () => {
//     stopRecording();
//     transcription = "";
//     transcriptionDiv.innerHTML = "";
// });
