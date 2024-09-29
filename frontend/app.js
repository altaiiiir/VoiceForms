import {StartStreamTranscriptionCommand, TranscribeStreamingClient,} from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";
import {Buffer} from "buffer";
import {BedrockRuntimeClient, ConverseCommand} from "@aws-sdk/client-bedrock-runtime";

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

const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const transcriptionDiv = document.getElementById("transcription");
const modelResponseDiv = document.getElementById("modelResponse");

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const phoneNumberInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const reasonForCallInput = document.getElementById("reason");

let transcription = "";
let model_responses = "";

let formModel = {
    "first_name": "",
    "last_name": "",
    "phone_number": "",
    "email": "",
    "reason_for_call": "",
}

startButton.addEventListener("click", async () => {
    await startRecording((text) => {

        invokeModel(text, formModel).then((response) => {
            // console.log('invokeModel(..).then()', response);

            if (response.first_name !== "") {
                formModel.first_name = response.first_name;
            }
            if (response.last_name !== "") {
                formModel.last_name = response.last_name;
            }
            if (response.phone_number !== "") {
                formModel.phone_number = response.phone_number;
            }
            if (response.email !== "") {
                formModel.email = response.email;
            }
            if (response.reason_for_call !== "") {
                formModel.reason_for_call = response.reason_for_call;
            }

            model_responses += `Bot: ${response}<br>`;
            modelResponseDiv.innerHTML = model_responses;

            firstNameInput.value = formModel.first_name;
            lastNameInput.value = formModel.last_name;
            phoneNumberInput.value = formModel.phone_number;
            emailInput.value = formModel.email;
            reasonForCallInput.value = formModel.reason_for_call;
        });

        transcription += `Human: ${text}<br>`;
        transcriptionDiv.innerHTML = transcription;
    });
});

stopButton.addEventListener("click", () => {
    stopRecording();
});

/*
    Bedrock!!
 */

// Create a BedrockRuntimeClient
const client = new BedrockRuntimeClient({
    region: 'us-west-2',
    credentials: {
        accessKeyId: 'ASIAVZI3N25247CFELPS',
        secretAccessKey: 'pAwBiKAsqJNSmtkGvG/sMKiPyEGZrkEEzleL52Jv',
        sessionToken: 'IQoJb3JpZ2luX2VjEAUaCXVzLWVhc3QtMSJHMEUCIQD9kWxM0iX282z6G16dcYZmp2A8dpa+33u40xEQej7sLwIgL0qZ+RSpAvwKviHQdESP4uDWfAkvdTQ74LZv6rPoO1IqmQIIThACGgwzOTc4Nzg4NzYwMjEiDHpSstR8F2yi/8SbPCr2AUjzTgFqtQmy+B0AYU/t5sdjVYBPTVTN8g4gywt12vd6RECn8GtZGz846rZbbcmuRcREsFDo8LMaSDUt8QHX137LMBKBewoTWsvycMVncJr0LJ7V2ZQQ30U6YIc+5vr9aNNwZEZfMgyahlATd6dWMNqjlDVpxvxMa2BlumMtkqonMLDCaQnOzYLOtMJ0u0GlIW3PdHOiarCrlioWbh0YK0u10wVgKO3jT5HbSHxllv7d8HedM5pQUPpZkRAqkfT/AdiJqtK6kQ9sHXgQMUM3zeZeS1Z3//0h37FGqrZw/N7PGzUgFGH2kB5IbN2Wwg2tbO+FinJR9zDX2uG3BjqdAdCWcy1Ti5Qy4wQIp+cITXBFYJR7w25q9pi+eQMpxcKRaIwjCn7oI45KP1CWVI6b1NXB2Ry2+HRsgiLNikSqtO1yrZiACpuEhcKQWnpQT0d89jmIfsgwa12KraYtFLscG7K8ve0Qswt7bE8lAOJ/OXP7LhTi7iuWefn05WuD+nptearbljpLb4kHfI2Eor4a5l90wonPwYZ5ncvHqro='
    },
});

const systemPrompt = `
        Analyze the call transcript and extract relevant customer information that would typically be captured in a form.
        Focus on extracting entities like names, addresses, phone numbers, email addresses, dates, and any other
        specific details relevant to your forms.

        Return the extracted information in a structured JSON format.

        Example JSON output:
        {
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+1-555-123-4567",
            "email": "john.doe@example.com",
            "reason_for_call": "Help with my account"
        }

        Ensure the extracted information is accurate and matches the context of the conversation.

        If an entity is mentioned multiple times, prioritize the most recent or most complete instance.
        If an entity cannot be confidently extracted, assign an empty string.
        
        Ensure that your response ONLY includes the result JSON and no other text.
        
        Extracted information should be returned in the following format:
        {
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+1-555-123-4567",
            "email": "john.doe@example.com",
            "reason_for_call": "Help with my account"
        }
        
        If you are unable to extract any information, return the form with empty strings as values, for example:
        {
            "first_name": "",
            "last_name": "",
            "phone_number": "",
            "email": "",
            "reason_for_call": ""
        }
        

        Here's the call transcript:  
        `;

// Define your model ID and prompt
const modelId = "anthropic.claude-3-haiku-20240307-v1:0";

// Create an InvokeModelCommand
async function invokeModel(prompt, formModel) {
    const command = new ConverseCommand({
            modelId: modelId,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            text: systemPrompt,
                        },
                        {
                            text: `The current state of the form is: ${JSON.stringify(formModel)}`,
                        },
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
            inferenceConfig: {
                maxTokens: 1000,
                temperature: 0.7,
                topP: 1,
            },
            // system prompt not supported for Haiku
            // system: [
            //     {
            //         text: "You are responsible for extracting the French translation from the model's response.",
            //     },
            // ],
        }
    );

    try {
        // Send the request and await the response
        const response = await client.send(command);

        // Process the response
        // JSON.parse()
        const generatedText = await JSON.parse(response.output.message.content[0].text);
        console.log('Generated: ', generatedText);

        return generatedText;
    } catch (error) {
        console.error("Error invoking Bedrock model:", error);
    }
}

