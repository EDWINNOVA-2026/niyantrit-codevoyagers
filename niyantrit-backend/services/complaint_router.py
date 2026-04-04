"""
NLP-based Complaint Routing Service
Uses OpenAI GPT API with function calling to classify complaints and route them.
"""
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

import os
import json
from typing import Tuple, Optional
from models import ComplaintCategory
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client (optional)
openai_client = None
if OpenAI and os.getenv("OPENAI_API_KEY"):
    try:
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception:
        openai_client = None

def classify_complaint(complaint_text: str) -> Tuple[Optional[ComplaintCategory], float]:
    """
    Classify a complaint into one of the predefined categories using GPT.
    
    Args:
        complaint_text: The complaint description or formal text
        
    Returns:
        Tuple of (category, confidence_score) where confidence is 0-1
    """
    if not complaint_text or not openai_client:
        return None, 0.5  # Default fallback when OpenAI not available
    
    try:
        # Define the tools for GPT to use
        # Generate enum values dynamically from ComplaintCategory
        category_values = [c.value for c in ComplaintCategory]
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "categorize_complaint",
                    "description": "Categorize a construction project complaint into a specific category",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "category": {
                                "type": "string",
                                "enum": category_values,
                                "description": "The category this complaint falls into"
                            },
                            "confidence": {
                                "type": "number",
                                "description": "Confidence score from 0 to 1",
                                "minimum": 0,
                                "maximum": 1
                            },
                            "reasoning": {
                                "type": "string",
                                "description": "Brief explanation of why this category was chosen"
                            }
                        },
                        "required": ["category", "confidence", "reasoning"]
                    }
                }
            }
        ]
        
        # Call GPT to classify
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert at categorizing complaints in construction projects.
                    Analyze the complaint and determine which category it belongs to using the provided function.
                    Consider all aspects of the complaint to make an accurate classification."""
                },
                {
                    "role": "user",
                    "content": f"Please categorize this complaint:\n\n{complaint_text}"
                }
            ],
            tools=tools,
            tool_choice="auto",
            temperature=0.3
        )
        
        # Extract tool call result
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            result = json.loads(tool_call.function.arguments)
            
            # Convert string category to enum
            category = ComplaintCategory(result["category"])
            confidence = float(result["confidence"])
            
            return category, confidence
        
        return None, 0.5
        
    except Exception as e:
        print(f"Error in classify_complaint: {e}")
        return None, 0.5

def determine_routing(category: ComplaintCategory, location: str) -> dict:
    """
    Determine which official should handle this complaint based on category and location.
    
    Args:
        category: The complaint category (may be None for uncategorized complaints)
        location: The project location/jurisdiction
        
    Returns:
        Dict with routing info: {role, jurisdiction, priority}
    """
    
    # Handle None category safely
    if category is None:
        return {
            "role": "Official",
            "priority": 5,
            "category": "UNKNOWN",
            "target_department": "General Services",
            "jurisdiction": location
        }
    
    # Define category to role mapping
    category_role_mapping = {
        ComplaintCategory.LABOR_VIOLATION: {
            "best_role": "Official",
            "priority": 9,
            "description": "Labor Department"
        },
        ComplaintCategory.FUND_MISUSE: {
            "best_role": "Official",
            "priority": 10,
            "description": "Finance Audit Division"
        },
        ComplaintCategory.SAFETY_HAZARD: {
            "best_role": "Official",
            "priority": 9,
            "description": "Safety & Compliance Officer"
        },
        ComplaintCategory.QUALITY_ISSUE: {
            "best_role": "Official",
            "priority": 7,
            "description": "Quality Assurance Division"
        },
        ComplaintCategory.DELAY: {
            "best_role": "Official",
            "priority": 6,
            "description": "Project Management Division"
        },
        ComplaintCategory.ENVIRONMENTAL: {
            "best_role": "Official",
            "priority": 8,
            "description": "Environmental Compliance Officer"
        },
        ComplaintCategory.OTHER: {
            "best_role": "Official",
            "priority": 5,
            "description": "General Services"
        }
    }
    
    routing_info = category_role_mapping.get(category, {
        "best_role": "Official",
        "priority": 5,
        "description": "General Services"
    })
    
    return {
        "role": routing_info["best_role"],
        "priority": routing_info["priority"],
        "category": category.value,
        "target_department": routing_info["description"],
        "jurisdiction": location
    }

def enhance_complaint_text(raw_complaint: str) -> str:
    """
    Convert simple/spoken complaint text into formal, clear complaint text using GPT.
    
    Args:
        raw_complaint: Raw complaint text (from voice transcription or citizen input)
        
    Returns:
        Formal, structured complaint text
    """
    if not raw_complaint or not openai_client:
        return raw_complaint  # Return as-is if API not available
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert at converting informal complaint descriptions into formal, 
                    clear, and structurally sound complaint documents suitable for official record-keeping.
                    Focus on clarity, completeness, and professional tone.
                    Return only the formal complaint text, no other text."""
                },
                {
                    "role": "user",
                    "content": f"""Please convert this complaint into a formal, well-structured complaint text:
                    
{raw_complaint}

Format it as a professional complaint that includes:
- A clear subject line
- Summary of the issue
- Detailed description of what happened
- Impact or consequences
- Any recommendations if applicable"""
                }
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        formal_text = response.choices[0].message.content.strip()
        return formal_text
        
    except Exception as e:
        print(f"Error in enhance_complaint_text: {e}")
        return raw_complaint

def get_routing_recommendations(category: ComplaintCategory, location: str) -> dict:
    """
    Get full routing recommendations for a complaint.
    
    Args:
        category: The complaint category
        location: The project location/jurisdiction
    
    Returns dict with category, confidence, routing info, and priority level.
    """
    routing = determine_routing(category, location)
    
    return {
        "category": category.value if category else "UNKNOWN",
        "routing": routing,
        "priority": routing["priority"],
        "department": routing["target_department"]
    }
