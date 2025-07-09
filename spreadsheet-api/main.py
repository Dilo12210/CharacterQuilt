from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
print(f"API Key loaded: {api_key[:10] if api_key else 'None'}...")
client = OpenAI(api_key=api_key)

class LLMRequest(BaseModel):
    columns: List[str]
    data: List[Dict[str, Any]]
    prompt: str

@app.post("/llm-complete")
async def llm_complete(req: LLMRequest):
    print(f"Received request with {len(req.data)} rows and prompt: {req.prompt}")
    
    # Check if API key is set
    if not api_key or api_key == "your-api-key-here":
        print("OpenAI API key not set, using fallback")
        new_col = "LLM Result (No API Key)"
        results = []
        for row in req.data:
            major = row.get("Major", "").lower()
            if "engineer" in major or "computer" in major:
                results.append("Engineer")
            else:
                results.append("Non-Engineer")
        return {
            "new_column": new_col,
            "values": results
        }
    
    try:
        # Prepare the data for the LLM
        data_text = "\n".join([
            f"Row {i+1}: " + ", ".join([f"{col}: {row.get(col, '')}" for col in req.columns])
            for i, row in enumerate(req.data)
        ])
        
        print(f"Data prepared: {data_text[:100]}...")
        
        # Create the prompt for the LLM
        system_prompt = """You are a classification assistant. You will receive a list of college majors and a classification prompt. 
        Your task is to classify each major according to the specific prompt given.
        
        IMPORTANT: Each classification should be based ONLY on the current prompt, not previous classifications.
        If the prompt asks for "STEM vs Non-STEM", classify accordingly.
        If the prompt asks for "Engineer vs Non-Engineer", classify accordingly.
        If the prompt asks for something else, follow that specific prompt.
        
        Respond with ONLY the classification values, one per line, in the same order as the data provided."""
        
        print("Calling OpenAI API...")
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the majors to classify:\n{data_text}\n\nClassification prompt: {req.prompt}\n\nPlease classify each major according to the prompt above."}
            ],
            max_tokens=500,
            temperature=0.1
        )
        
        # Parse the response
        llm_response = response.choices[0].message.content.strip()
        print(f"LLM Response: {llm_response}")
        
        results = [line.strip() for line in llm_response.split('\n') if line.strip()]
        
        # Ensure we have the right number of results
        while len(results) < len(req.data):
            results.append("")
        results = results[:len(req.data)]
        
        print(f"Final results: {results}")
        
        return {
            "new_column": req.prompt,
            "values": results
        }
        
    except Exception as e:
        # Fallback to mock data if API fails
        print(f"LLM API error: {e}")
        new_col = "LLM Result (Fallback)"
        results = []
        for row in req.data:
            major = row.get("Major", "").lower()
            if "engineer" in major or "computer" in major:
                results.append("Engineer")
            else:
                results.append("Non-Engineer")
        return {
            "new_column": new_col,
            "values": results
        } 