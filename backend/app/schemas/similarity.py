from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class SimilarityExplanation(BaseModel):
    overall_score: float
    text_similarity_score: float
    category_match: bool
    institution_match: bool
    shared_keywords: List[str]
    rationale: str

class StagedBreakdownOut(BaseModel):
    stage1_exact_identifier_score: float
    stage1_exact_identifier_matched: bool
    stage1_identifier_type: Optional[str] = None
    stage2_normalized_name_score: float
    stage2_alias_matched: bool
    stage2_matched_alias: Optional[str] = None
    stage3_metadata_score: float
    stage3_category_relationship: str
    stage3_cross_bureau: bool
    stage3_temporal_days_diff: Optional[int] = None
    stage3_shared_keywords: List[str] = Field(default_factory=list)
    stage4_semantic_score: float
    composite_score: float
    stage_1_exact_id_match: Optional[bool] = None
    stage_2_name_similarity: Optional[float] = None
    stage_3_metadata_similarity: Optional[float] = None
    stage_4_semantic_similarity: Optional[float] = None

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
    confidence_tier: str = "MEDIUM"
    reasons: List[str] = Field(default_factory=list)
    explanation: SimilarityExplanation
    breakdown: Optional[StagedBreakdownOut] = None
    staged_breakdown: Optional[StagedBreakdownOut] = None
    linkage_status: Optional[str] = None
    linkage_id: Optional[int] = None

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
    total_evaluated_candidates: int = 0

class LinkageCreateSchema(BaseModel):
    source_complaint_id: int
    target_complaint_id: int
    link_type: str = "CROSS_BUREAU_OVERLAP"  # DUPLICATE, RELATED_INQUIRY, CROSS_BUREAU_OVERLAP, REPEAT_OFFENSE
    similarity_score: float
    explanation: Dict[str, Any]
    notes: Optional[str] = None
    rationale: Optional[str] = None

class LinkageDecisionSchema(BaseModel):
    status: str  # CONFIRMED_RELATED, NOT_RELATED, ALREADY_LINKED, or legacy CONFIRMED_BY_OFFICER, DISMISSED
    verification_notes: Optional[str] = None
    rationale: Optional[str] = None

class LinkageOut(BaseModel):
    id: int
    source_complaint_id: int
    source_complaint_no: Optional[str] = None
    target_complaint_id: int
    target_complaint_no: Optional[str] = None
    link_type: str
    similarity_score: float
    confidence_tier: Optional[str] = "MEDIUM"
    explanation_json: str
    reasons: List[str] = Field(default_factory=list)
    rationale: Optional[str] = None
    status: str
    verified_by_id: Optional[int] = None
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BenchmarkMetricScores(BaseModel):
    precision: float
    recall: float
    f1_score: float
    accuracy: float

class ConfusionMatrixOut(BaseModel):
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int

class BenchmarkTestCaseResult(BaseModel):
    test_id: str
    test_type: str
    description: str
    ground_truth: bool
    predicted_score: float
    confidence: str
    classification: str
    reasons: List[str]

class BenchmarkEvaluationOut(BaseModel):
    evaluation_timestamp: str
    total_evaluated_pairs: int
    applied_thresholds: Dict[str, float]
    confusion_matrix: ConfusionMatrixOut
    metrics: BenchmarkMetricScores
    results: List[BenchmarkTestCaseResult]

class OptimalThresholdsOut(BaseModel):
    optimal_thresholds: Dict[str, float]
    optimal_f1: float
    sweep_grid: List[Dict[str, Any]]
