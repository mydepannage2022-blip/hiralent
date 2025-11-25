from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging
from typing import Dict, Any

from app.variation_engine.variant_generator import VariationGenerator

# Initialize router
router = APIRouter(prefix="/variations", tags=["Variation Engine"])

# Initialize variation generator
variation_generator = VariationGenerator()

logger = logging.getLogger(__name__)

@router.post("/generate")
async def generate_variations(request: Dict[str, Any]):
    """
    Generate multiple anti-cheat variations of a base question
    
    Body:
    {
        "base_question": { ... },  // The original question to vary
        "variation_count": 10,     // Number of variations to generate
        "preserve_difficulty": true
    }
    """
    try:
        base_question = request.get("base_question")
        variation_count = request.get("variation_count", 10)
        
        if not base_question:
            raise HTTPException(
                status_code=400, 
                detail="base_question is required"
            )
        
        logger.info(f"Generating {variation_count} variations for: {base_question.get('title', 'Unknown')}")
        
        # Generate variations
        variations = await variation_generator.generate_variations(
            base_question, 
            num_variations=variation_count
        )
        
        # Analyze the variations
        difficulty_distribution = {}
        for variation in variations:
            difficulty = variation['difficulty']
            difficulty_distribution[difficulty] = difficulty_distribution.get(difficulty, 0) + 1
        
        return {
            "success": True,
            "message": f"Generated {len(variations)} variations",
            "variations_generated": len(variations),
            "base_question_id": base_question.get('id', 'unknown'),
            "difficulty_distribution": difficulty_distribution,
            "sample_variations": variations[:3],  # Return first 3 as samples
            "metadata": {
                "variation_engine_version": "1.0.0",
                "generated_at": datetime.now().isoformat(),
                "question_type": variations[0]['metadata']['question_type'] if variations else 'unknown'
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating variations: {e}")
        raise HTTPException(status_code=500, detail=f"Variation generation failed: {str(e)}")

@router.post("/analyze-variability")
async def analyze_question_variability(request: Dict[str, Any]):
    """
    Analyze how variable a question can be for anti-cheat purposes
    """
    try:
        base_question = request.get("base_question")
        
        if not base_question:
            raise HTTPException(status_code=400, detail="base_question is required")
        
        # Generate sample variations to analyze variability
        sample_variations = await variation_generator.generate_variations(
            base_question, num_variations=5
        )
        
        # Calculate variability metrics
        unique_titles = len(set(v['title'] for v in sample_variations))
        difficulty_changes = len(set(v['difficulty'] for v in sample_variations))
        parameter_variations = len(set(str(v['parameters']) for v in sample_variations))
        
        variability_score = min(100, (unique_titles * 15) + (difficulty_changes * 10) + (parameter_variations * 5))
        
        return {
            "success": True,
            "variability_analysis": {
                "question_type": sample_variations[0]['metadata']['question_type'] if sample_variations else 'unknown',
                "variability_score": variability_score,
                "max_recommended_variations": min(20, variability_score // 5),
                "unique_titles_generated": unique_titles,
                "difficulty_variations": difficulty_changes,
                "parameter_variations": parameter_variations,
                "suitability_for_anti_cheat": "high" if variability_score > 70 else "medium" if variability_score > 40 else "low"
            },
            "sample_variations": sample_variations[:2]
        }
        
    except Exception as e:
        logger.error(f"Error analyzing question variability: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/health")
async def variation_engine_health():
    """Health check for the variation engine"""
    engine_info = variation_generator.get_engine_info()
    
    return {
        "success": True,
        "service": "Variation Engine",
        "status": "healthy",
        "version": engine_info['version'],
        "components": engine_info['components'],
        "supported_question_types": engine_info['supported_question_types'],
        "timestamp": datetime.now().isoformat()
    }

@router.post("/generate-from-template")
async def generate_variations_from_template(request: Dict[str, Any]):
    """
    Generate variations using a template question (for testing)
    """
    try:
        question_type = request.get("question_type", "array_operations")
        difficulty = request.get("difficulty", "medium")
        variation_count = request.get("variation_count", 5)
        
        # Create template question based on type
        template_question = _create_template_question(question_type, difficulty)  # ✅ FIXED
        
        variations = await variation_generator.generate_variations(
            template_question, num_variations=variation_count
        )
        
        return {
            "success": True,
            "template_question": template_question,
            "variations_generated": len(variations),
            "variations": variations
        }
        
    except Exception as e:
        logger.error(f"Error generating from template: {e}")
        raise HTTPException(status_code=500, detail=f"Template generation failed: {str(e)}")
@router.get("/supported-types")
async def get_supported_question_types():
    """Get list of supported question types for variation"""
    engine_info = variation_generator.get_engine_info()
    
    return {
        "success": True,
        "supported_question_types": engine_info['supported_question_types'],
        "total_types": len(engine_info['supported_question_types'])
    }

def _create_template_question(question_type: str, difficulty: str) -> Dict[str, Any]:
    """Create a template question for testing"""
    templates = {
        'array_operations': {
            'id': 'template-array-001',
            'title': 'Array Sorting Problem',
            'problemStatement': 'Given an array of integers, sort them in ascending order.',
            'difficulty': difficulty,
            'skillTags': ['arrays', 'sorting', 'algorithms'],
            'type': 'coding',
            'parameters': {
                'input_size': 10,
                'min_value': 1,
                'max_value': 100,
                'operation': 'sort'
            }
        },
        'string_manipulation': {
            'id': 'template-string-001',
            'title': 'String Reversal Problem',
            'problemStatement': 'Given a string, reverse its characters.',
            'difficulty': difficulty,
            'skillTags': ['strings', 'manipulation'],
            'type': 'coding',
            'parameters': {
                'string_length': 10,
                'character_set': 'alphanumeric',
                'operation': 'reverse'
            }
        },
        'math_operations': {
            'id': 'template-math-001',
            'title': 'Prime Number Check',
            'problemStatement': 'Write a function to check if a number is prime.',
            'difficulty': difficulty,
            'skillTags': ['math', 'algorithms'],
            'type': 'coding',
            'parameters': {
                'min_value': 1,
                'max_value': 100,
                'operation': 'prime'
            }
        }
    }
    
    return templates.get(question_type, templates['array_operations'])