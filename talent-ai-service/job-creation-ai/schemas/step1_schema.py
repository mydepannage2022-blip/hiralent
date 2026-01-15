from pydantic import BaseModel
from typing import List, Optional

class Step1Request(BaseModel):
    jobTitle: Optional[str]
    location: Optional[str]
    department: Optional[str]

class Step1Response(BaseModel):
    titleSuggestions: List[str]
    departmentSuggestions: List[str]
    senioritySuggestions: List[str]
    workplaceTypeSuggestions: List[str]
    miniSummary: Optional[str]
