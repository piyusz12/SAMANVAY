from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class SimilarityExplanation(BaseModel):
    overall_score: float
    text_similarity_score: float
    category_match: bool
    institution_match: bool
    shared_keywords: List[str]
    rationale: str

class SimilarityMatchItem(BaseModel):
    complaint_id: int
    complaint_no: str
    institution_id: int
    institution_name: str
    bureau: str
    status: str
    subject: str
    category: str
    similarity_score: float
    explanation: SimilarityExplanation

class SimilarityCheckRequest(BaseModel):
    subject: str
    description: str
    institution_id: int
    category: str
    exclude_complaint_id: Optional[int] = None

class SimilarityCheckResponse(BaseModel):
    matches: List[SimilarityMatchItem]
    highest_score: float
    duplicate_suspected: bool
    cross_bureau_overlap_suspected: bool

class LinkageCreateSchema(BaseModel):
    source_complaint_id: int
    target_complaint_id: int
    link_type: str = "CROSS_BUREAU_OVERLAP"  # DUPLICATE, RELATED_INQUIRY, CROSS_BUREAU_OVERLAP, REPEAT_OFFENSE
    similarity_score: float
    explanation: Dict[str, Any]
    notes: Optional[str] = None

class LinkageDecisionSchema(BaseModel):
    status: str  # CONFIRMED_BY_OFFICER, DISMISSED
    verification_notes: Optional[str] = None

class LinkageOut(BaseModel):
    id: int
    source_complaint_id: int
    source_complaint_no: Optional[str] = None
    target_complaint_id: int
    target_complaint_no: Optional[str] = None
    link_type: str
    similarity_score: float
    explanation_json: str
    status: str
    verified_by_id: Optional[int] = None
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
