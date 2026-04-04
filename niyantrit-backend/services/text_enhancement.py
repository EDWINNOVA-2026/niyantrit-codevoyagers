"""
Text Enhancement Service
Uses OpenAI GPT API to convert simple/spoken complaints into formal, structured text.
"""
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client (optional)
openai_client = None
if OpenAI and os.getenv("OPENAI_API_KEY"):
    try:
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        openai_client = None

def enhance_complaint_text(raw_complaint: str, add_structure: bool = True) -> str:
    """
    Convert simple/spoken complaint text into formal, clear complaint text.
    
    Args:
        raw_complaint: Raw complaint text (from voice transcription or citizen input)
        add_structure: If True, add formal structure with sections
        
    Returns:
        Enhanced, formal complaint text
    """
    
    if not raw_complaint or not openai_client:
        return raw_complaint  # Return as-is when OpenAI not available
    
    try:
        if add_structure:
            prompt = f"""Convert this informal complaint into a formal, well-structured complaint document:

{raw_complaint}

Format the output as a professional complaint with these sections:
1. **SUBJECT**: Create a concise 1-line subject
2. **SUMMARY**: 2-3 sentence summary of the issue
3. **DETAILS**: Detailed description of what happened, when, where, and who was involved
4. **IMPACT**: How this issue affects the project, workers, or public
5. **EVIDENCE**: Any documentary evidence or witnesses mentioned

Return ONLY the formatted complaint, nothing else."""
        else:
            prompt = f"""Rephrase this complaint into clear, professional language suitable for official records:

{raw_complaint}

Keep the same meaning but make it more formal and grammatically correct."""
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert at converting informal complaint descriptions into formal, 
                    clear documents suitable for official record-keeping. Be concise but thorough. 
                    Focus on clarity and professional tone."""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=600
        )
        
        formal_text = response.choices[0].message.content.strip()
        return formal_text
    
    except Exception as e:
        print(f"Error enhancing complaint text: {e}")
        return raw_complaint

def extract_key_issues(complaint_text: str) -> Optional[list]:
    """
    Extract key issues/topics from a complaint using GPT.
    
    Args:
        complaint_text: The complaint description
        
    Returns:
        List of key issues or None if extraction fails
    """
    
    if not complaint_text or not openai_client:
        return None
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """Extract the key issues or problems mentioned in this complaint. 
                    Return as a JSON array of strings, each being a distinct issue. 
                    Return ONLY the JSON array, no other text."""
                },
                {
                    "role": "user",
                    "content": complaint_text
                }
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        import json
        content = response.choices[0].message.content.strip()
        # Try to parse as JSON
        issues = json.loads(content)
        return issues if isinstance(issues, list) else None
    
    except Exception as e:
        print(f"Error extracting key issues: {e}")
        return None

def generate_resolution_summary(complaint_text: str, resolution_action: str) -> str:
    """
    Generate a professional summary of how a complaint was resolved.
    
    Args:
        complaint_text: The original complaint
        resolution_action: What action was taken to resolve it
        
    Returns:
        Professional resolution summary
    """
    
    if not openai_client:
        return resolution_action
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """Create a professional resolution summary that clearly documents 
                    how a complaint was handled."""
                },
                {
                    "role": "user",
                    "content": f"""Original Complaint: {complaint_text}
                    
Resolution Action Taken: {resolution_action}

Please write a professional resolution summary (2-3 sentences) documenting this."""
                }
            ],
            temperature=0.3,
            max_tokens=250
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"Error generating resolution summary: {e}")
        return resolution_action

def check_complaint_completeness(complaint_text: str) -> dict:
    """
    Check if a complaint has all necessary information.
    
    Returns dict with completeness score and missing information suggestions.
    """
    
    if not openai_client:
        return {"score": 0.5, "suggestions": []}
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """Analyze if this complaint contains all necessary information for proper investigation.
                    Return a JSON object with:
                    - "completeness_score": 0-1 (how complete the complaint is)
                    - "is_complete": boolean
                    - "missing_info": list of what information is missing
                    - "suggestions": list of improvement suggestions
                    
                    Return ONLY valid JSON, no other text."""
                },
                {
                    "role": "user",
                    "content": complaint_text
                }
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        import json
        content = response.choices[0].message.content.strip()
        result = json.loads(content)
        return result
    
    except Exception as e:
        print(f"Error checking complaint completeness: {e}")
        return {
            "completeness_score": 0.5,
            "is_complete": False,
            "missing_info": ["Unable to analyze"],
            "suggestions": []
        }
