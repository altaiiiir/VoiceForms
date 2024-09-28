from fastapi import FastAPI
import uvicorn
from pydantic import BaseModel
import boto3
from langchain_aws import ChatBedrock
from langchain_core.prompts import ChatPromptTemplate

# Initialize FastAPI app
app = FastAPI()

# Initialize Bedrock client
bedrock_client = boto3.client(service_name="bedrock-runtime", region_name="us-west-2")
model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

llm = ChatBedrock(
    model_id=model_id,
    model_kwargs={"temperature": 1},
)

# Define request model
class TranscriptRequest(BaseModel):
    transcript: str

# Define response model
class ExtractedInfo(BaseModel):
    first_name: str = None
    last_name: str = None
    phone_number: str = None
    email: str = None
    address: str = None

def extract_info(transcript: str):
    system_prompt = (
        """
        Analyze the call transcript and extract relevant customer information that would typically be captured in a form.
        Focus on extracting entities like names, addresses, phone numbers, email addresses, dates, and any other
        specific details relevant to your forms.

        Return the extracted information in a structured JSON format.

        Example JSON output:
        {{
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+1-555-123-4567",
            "email": "john.doe@example.com",
            "address": "123 Main St, Anytown, CA 12345"
        }}

        Ensure the extracted information is accurate and matches the context of the conversation.

        If an entity is mentioned multiple times, prioritize the most recent or most complete instance.
        If an entity cannot be confidently extracted, omit it from the JSON output.
        Ensure that your response ONLY includes the result JSON and no other text.

        Here's the call transcript: {transcript}
        """
    )

    # Create a prompt template
    prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                ("human", "{transcript}"),
            ]
    )

    # Create a chain with the prompt and the LLM
    chain = prompt | llm

    # Invoke the chain with the sample transcript
    response = chain.invoke({"transcript": transcript})

    # Parse the response content to a dictionary
    extracted_info = response.content

    # Ensure the response is a dictionary
    if isinstance(extracted_info, str):
        extracted_info = eval(extracted_info)

    return extracted_info

@app.post("/extract_info", response_model=ExtractedInfo)
def extract_info_endpoint(request: TranscriptRequest):
    info = extract_info(request.transcript)
    return info

def main():
    uvicorn.run(app, port=8000)

#Run the app with Uvicorn
if __name__ == "__main__":
    main()
