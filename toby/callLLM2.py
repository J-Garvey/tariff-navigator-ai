'''
Docstring for tester

auto sends in a bunch of passwords, starts out once that fit all other cchirteier but and move through and see if it passes or fials.
'''

import os

from dotenv import load_dotenv

# Load .env from the same directory as this script
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from google import genai
import time

import warnings

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    module="google.auth"
)

apiKey = os.environ.get("API_KEY")
if not apiKey:
    raise ValueError("GEMINI_API_KEY or API_KEY is not set. Add one to your .env file or export it.")

client = genai.Client(api_key=apiKey)

# password rules
import subprocess
import sys

def callLLM(TheContent):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=TheContent
        )
        return response.text
    except Exception as e:
        response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=TheContent
                )
        return response.text