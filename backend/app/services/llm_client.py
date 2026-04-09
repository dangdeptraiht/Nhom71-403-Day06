import os
import instructor
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo OpenAI client với Instructor để xuất Structured JSON (Pydantic)
client = instructor.from_openai(AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "")
))

def get_llm_client():
    return client
