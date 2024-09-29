import {StartStreamTranscriptionCommand, TranscribeStreamingClient,} from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";
import {Buffer} from "buffer";
import {BedrockRuntimeClient, ConverseCommand} from "@aws-sdk/client-bedrock-runtime";
import {PinataSDK} from "pinata";
import {PollyClient} from "@aws-sdk/client-polly";
import {getSynthesizeSpeechUrl} from "@aws-sdk/polly-request-presigner";


const AWS_DEFAULT_REGION="us-west-2"
const AWS_ACCESS_KEY_ID="ASIAVZI3N252Z35T4KMW"
const AWS_SECRET_ACCESS_KEY="dM06m/bVf4LIDHuUoKr11ppT1h8B2QOMLfRdyagm"
const AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjEBEaCXVzLWVhc3QtMSJHMEUCIQDL4f9xVzWPX8Ufuh4V1LgiTtO+GCX+dDYnDZofDeembAIga2jH6bxEjLC/PAH/U6XL67laiz3/n3Ycx8vylQcURVcqmQIIWhACGgwzOTc4Nzg4NzYwMjEiDHyMY1I30p6mtmHbEyr2AUFMtoqK1S+oLL3vPEy9WRrnMI4bu+L5qDTQbLvqrM31HIV5F0l21GdSMztPuogh9Quvb/ZEV7RQ5cGdnDP9U7E2+HoKscZtFPqPQlieYlV52VK7wXXK0wUTVzl20LVtEo3xeFp0TJlvLI6ZIZBEDbyJis6RSL7u/Gq5hL5O3twuzrU5JbxfSm5y3Nlc4aZU4Tsy/NhVKG/B1HYkVRx0pi3SpvF/TQ/Lvgafovd3c9nWr6zSoOrdOq+P9G9ekaZcpDyZKGsVInzFUBSiLzA6wCQmI2OAUU5xprJ6hH47RK3E9BaOmzDPGg7UI6mTapP1ZQc4yvuYpDD2ruS3BjqdAQCdST0ihFHh1CAGOVIvHyuuUT4cposdtgNrCEqFjbH8jz6iOFK0dz9fcPTymbv0kK/H0nOPLCOwQFzyzm8A+OMNDYWY50w1oV9HQwHF8mre2ZR7J7clDA3tZFvR0e2zwopajclbvRfVLhjopBSfHNJ0VvU/rv/yQu/0ghkmfpTVEiGDezAUxwWCYg46Rmw9Xrg8M6abe2PBPz/myuk="

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
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            sessionToken: AWS_SESSION_TOKEN
        },
    });
};
const stopRecording = async function () {
    if (microphoneStream) {
        microphoneStream.stop();
        microphoneStream.destroy();
        microphoneStream = undefined;
    }

    let cid = await uploadFileToPinata()
    let transcript = await getByCid(cid);
    let evaluation = await evaluateTranscript(transcript);
    showCallRatings(evaluation);


};

// === FRONTEND ===
const transcriptionDiv = document.getElementById("transcription");
const modelResponseDiv = document.getElementById("modelResponse");

const fullNameInput = document.getElementById("fullName");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const phoneNumberInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const reasonForCallInput = document.getElementById("reason");

const toggleRecordingButton = document.getElementById("toggleRecordingButton");
let recordingNow = false;

let transcription = "";
let model_responses = "";

let formModel = {
    "first_name": "",
    "last_name": "",
    "phone_number": "",
    "email": "",
    "reason_for_call": "",
    "next_utterance": ""
}

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
        startButtonAction().then(() => {
            console.log("toggleRecording - starting then")
        });
        console.log("toggleRecording - starting after");
    }
    recordingNow = !recordingNow;
}

toggleRecordingButton.addEventListener("click", toggleRecording);

const startButtonAction = async () => {

    // await speakText("Thank you for calling ACME. What is your name?")

    await startRecording((text) => {

        invokeModel(text, formModel).then((response) => {

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
            if (response.next_utterance !== "") {
                formModel.next_utterance = response.next_utterance;
            }

            model_responses += `Bot: ${response}<br>`;
            modelResponseDiv.innerHTML = model_responses;

            let fullName = formModel.first_name + " " + formModel.last_name;
            fullNameInput.innerText = "Lead: " + fullName;
            firstNameInput.value = formModel.first_name;
            lastNameInput.value = formModel.last_name;
            phoneNumberInput.value = formModel.phone_number;
            emailInput.value = formModel.email;
            reasonForCallInput.value = formModel.reason_for_call;
        });

        transcription += `Human: ${text}\n`;
        transcriptionDiv.innerHTML = transcription;
        console.log("Transcription(full current): ", transcription);

        // console.log('FormModel.next_utterance: ', formModel.next_utterance);
        // speakText(formModel.next_utterance);
    });
}

const stopButtonAction = () => {
    stopRecording();
}

const showCallRatings = (ratings) => {
    const ratingsPanel = document.getElementById("ratings-panel");
    const overallLabel = document.getElementById("overall-label");
    const overallProgress = document.getElementById("overall-progress");
    const speedLabel = document.getElementById("speed-label");
    const speedProgress = document.getElementById("speed-progress");
    const sentimentLabel = document.getElementById("sentiment-label");
    const sentimentProgress = document.getElementById("sentiment-progress");
    const accuracyLabel = document.getElementById("accuracy-label");
    const accuracyProgress = document.getElementById("accuracy-progress");
    const postitivesText = document.getElementById("positives-text");
    const opportunitiesText = document.getElementById("opportunities-text");

    ratingsPanel.classList.remove("hidden");
    overallLabel.innerText = `Overall: ${ratings.overall}`;
    overallProgress.value = ratings.overall;
    speedLabel.innerText = `Speed: ${ratings.speed}`;
    speedProgress.value = ratings.speed;
    sentimentLabel.innerText = `Sentiment: ${ratings.sentiment}`;
    sentimentProgress.value = ratings.sentiment;
    accuracyLabel.innerText = `Accuracy: ${ratings.accuracy}`;
    accuracyProgress.value = ratings.accuracy;
    postitivesText.innerText = `Positives: ${ratings.positives}`;
    opportunitiesText.innerText = `Opportunities: ${ratings.opportunities}`;
}

/*
    Bedrock!!
 */

// Create a BedrockRuntimeClient
const client = new BedrockRuntimeClient({
    region: 'us-west-2',
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        sessionToken: AWS_SESSION_TOKEN
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
            "next_utterance": "The next thing the bot should say to fill out this form"
        }
        
        NEVER RETURN THESE EXAMPLE VALUES.

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
            "reason_for_call": "Help with my account",
            "next_utterance": "The next thing the bot should say to fill out this form"
        }
        
        If you are unable to extract any information, return the form with empty strings as values, for example:
        {
            "first_name": "",
            "last_name": "",
            "phone_number": "",
            "email": "",
            "reason_for_call": "",
            "next_utterance": "",
        }
        
        Ideally, unless the form is complete, the next utterance should prompt the user for the missing information.

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
        const generatedText = await JSON.parse(response.output.message.content[0].text);
        console.log('Generated for InvokeModel: ', generatedText);

        return generatedText;
    } catch (error) {
        console.error("Error invoking Bedrock model:", error);
    }
}


const pinata = new PinataSDK({
    pinataJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzYjE4ZWYxYS1hNThiLTQyODYtYmExMy1jODk1MDFmZDk1NWQiLCJlbWFpbCI6ImphbWVzLmJ5YXJzQHNwcmluZ3ZlbnR1cmVncm91cC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmUzMDNkZmVjYWE1MGVkZGE5MTgiLCJzY29wZWRLZXlTZWNyZXQiOiJkOWNkMjhiZDdlOTBlMzA5Mzk4YjgxM2ZkMzdhOWZmNGVjYjg2NzRiNzRhOTU5ZGEwYzc4ZGIyNDNhNWI2OWRkIiwiZXhwIjoxNzU5MDcwNzAyfQ.9x3_QVMDGKv5LaQovVR1PdK4Sdsy8Rw_eXEWENh6BRQ",
    pinataGateway: "amber-kind-cuckoo-112.mypinata.cloud",
});

// let cid = "";

async function uploadFileToPinata() {
    try {
        const timestamp = new Date().toISOString();

        const file = new File([transcriptionDiv.innerHTML], `${timestamp}.txt`, {type: "text/plain"});
        const upload = await pinata.upload.file(file);
        let cid = upload.cid;
        console.log(upload);
        return cid
    } catch (error) {
        console.log(error);
    }
}

async function getByCid(cid) {
    try {
        const retrievedFile = await fetch(`http://localhost:8080/content/${cid}`);

        const reader = retrievedFile.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let done = false;

        while (!done) {
            const {value, done: streamDone} = await reader.read();
            done = streamDone;
            if (value) {
                result += decoder.decode(value, {stream: true});
            }
        }

        console.log(result);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function evaluateTranscript(transcript) {
    const command = new ConverseCommand({
            modelId: modelId,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            text: `You are a conversation evaluator responsible for evaluating a call transcript and
                                judging the agent's performance in interacting with the customer.
                                
                                This will be used to provide feedback to the agent and the business about the customer interaction.
                                
                                Reply with an evaluation of the speed, accuracy, and overall performance. Each 
                                of these metrics should be on a scale of 1 to 100 with 100 being the highest.
                                
                                You will also need to provide a summary of the positives and opportunities for improvement. Use
                                the extracted information to support your evaluation.
                                
                                Compute an overall sentiment score for the conversation using the customer transcript.
                                
                                Return the computed information in a structured JSON format.

                                Example JSON output:
                                {
                                    speed: integer,
                                    accuracy: integer,
                                    overall: integer,
                                    positives: string,
                                    opportunities: string,
                                    sentiment: integer,
                                }
                                
                                Ensure the extracted information is accurate and matches the context of the conversation.

                                Ensure that your response ONLY includes the result JSON and no other text.
                                
                                The customer's transcript is as follows: `,
                        },

                        {
                            text: transcript,
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
        console.log('Generated for evaluateTranscript: ', generatedText);

        return generatedText;
    } catch (error) {
        console.error("Error invoking Bedrock model:", error);
    }
}


// Initialize the Polly client
const pollyClient = new PollyClient({
    region: 'us-west-2',
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        sessionToken: AWS_SESSION_TOKEN
    },
});

const speechParams = {
    OutputFormat: "mp3",
    Text: "",
    VoiceId: "Matthew",
    SampleRate: "16000",
    Engine: "neural",
}

const synthesizeSpeech = async (text) => {
    speechParams.Text = text;
    console.log('speechParams', speechParams)

    try {
        let url = await getSynthesizeSpeechUrl({
            client: pollyClient,
            params: speechParams,
        });

        return url;

    } catch (error) {
        console.error("Error synthesizing speech:", error);
    }
};

async function speakText(text) {
    console.log('speakText: ', text)
    const audioUrl = await synthesizeSpeech(text);
    console.log('audioUrl: ', audioUrl)

    document.getElementById("audioSource").src = audioUrl;
    document.getElementById("audioPlayback").load();
    document.getElementById("audioPlayback").play()
}
