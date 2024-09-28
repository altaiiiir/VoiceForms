import boto3
from langchain_aws import ChatBedrock
from langchain_core.prompts import ChatPromptTemplate

bedrock_client = boto3.client(service_name="bedrock-runtime", region_name="us-west-2")
model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"

llm = ChatBedrock(
    model_id=model_id,
    model_kwargs={"temperature": 1},
    streaming=True,
)


def get_transcript():
    sample_transcript = ("Hello, I'm Lisa from SVG. Can I get your first name please? Hi Lisa, this is Molly Thomas "
                         "and I have some questions about my policy!")
    return sample_transcript

def extract_info(sample_transcript):
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
    response = chain.invoke({"transcript": sample_transcript})

    return response


def main():
    # Receive a text transcript of the audio file
    sample_transcript = get_transcript()

    # Process the text transcript to extract the relevant information
    info = extract_info(sample_transcript)

    # Return the extracted information as a JSON object
    print(info.content)


if __name__ == '__main__':
    main()
