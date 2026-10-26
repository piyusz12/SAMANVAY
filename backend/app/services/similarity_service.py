import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution

STOPWORDS = {
    "the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "of", "for", "with",
    "by", "from", "up", "about", "into", "through", "after", "before", "this", "that",
    "these", "those", "i", "we", "he", "she", "they", "it", "our", "their", "has", "have",
    "had", "be", "been", "was", "were", "are", "do", "does", "did", "as", "or", "not"
}

def extract_keywords(text: str, max_words: int = 5) -> List[str]:
    tokens = re.findall(r'[a-zA-Z]{3,}', text.lower())
    filtered = [t for t in tokens if t not in STOPWORDS]
    # Count frequency
    counts = {}
    for t in filtered:
        counts[t] = counts.get(t, 0) + 1
    sorted_words = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [word for word, _ in sorted_words[:max_words]]

def calculate_explainable_similarity(
    db: Session,
    subject: str,
    description: str,
    institution_id: int,
    category: str,
    exclude_complaint_id: Optional[int] = None,
    threshold: float = 0.35
) -> Dict[str, Any]:
    """
    Computes explainable similarity between a query complaint and existing complaints in the repository.
    Strictly follows AICTE human-in-the-loop governance: outputs explainable scoring breakdown,
    shared features and rationale without performing any automated merge or decision.
    """
    query = db.query(Complaint)
    if exclude_complaint_id:
        query = query.filter(Complaint.id != exclude_complaint_id)
    
    candidates = query.all()
    if not candidates:
        return {
            "matches": [],
            "highest_score": 0.0,
            "duplicate_suspected": False,
            "cross_bureau_overlap_suspected": False
        }

    input_text = f"{subject} {description}".strip()
    input_keywords = set(extract_keywords(input_text, max_words=10))

    candidate_texts = [f"{c.subject} {c.description}".strip() for c in candidates]
    all_corpus = [input_text] + candidate_texts

    # TF-IDF Cosine Similarity
    try:
        vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        tfidf_matrix = vectorizer.fit_transform(all_corpus)
        cosine_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    except Exception:
        cosine_scores = [0.0] * len(candidates)

    matches = []
    highest_score = 0.0
    duplicate_suspected = False
    cross_bureau_overlap_suspected = False

    for idx, candidate in enumerate(candidates):
        text_sim = float(cosine_scores[idx])
        category_match = (candidate.category.lower() == category.lower())
        institution_match = (candidate.institution_id == institution_id)

        # Weighted Explainable Formula
        # Text similarity: 55% weight
        # Institution identity match: 30% weight
        # Category match: 15% weight
        composite_score = (text_sim * 0.55) + (0.30 if institution_match else 0.0) + (0.15 if category_match else 0.0)
        composite_score = round(min(max(composite_score, 0.0), 1.0), 3)

        if composite_score >= threshold:
            candidate_keywords = set(extract_keywords(candidate_texts[idx], max_words=10))
            shared_keywords = list(input_keywords.intersection(candidate_keywords))

            # Build explainable natural language rationale
            reasons = []
            if institution_match:
                reasons.append("Identical institution")
            else:
                reasons.append("Different institution")

            if category_match:
                reasons.append(f"Matching category '{category}'")

            reasons.append(f"{int(text_sim * 100)}% semantic narrative similarity")

            if shared_keywords:
                reasons.append(f"Shared salient keywords: [{', '.join(shared_keywords[:4])}]")

            rationale = " | ".join(reasons)

            inst = candidate.institution
            inst_name = inst.name if inst else "Unknown Institution"

            if composite_score > highest_score:
                highest_score = composite_score

            if composite_score >= 0.70 and institution_match:
                duplicate_suspected = True

            if institution_match and candidate.status not in ["DISPOSED", "RESOLVED"]:
                cross_bureau_overlap_suspected = True

            matches.append({
                "complaint_id": candidate.id,
                "complaint_no": candidate.complaint_no,
                "institution_id": candidate.institution_id,
                "institution_name": inst_name,
                "bureau": candidate.bureau,
                "status": candidate.status,
                "subject": candidate.subject,
                "category": candidate.category,
                "similarity_score": composite_score,
                "explanation": {
                    "overall_score": composite_score,
                    "text_similarity_score": round(text_sim, 3),
                    "category_match": category_match,
                    "institution_match": institution_match,
                    "shared_keywords": shared_keywords,
                    "rationale": rationale
                }
            })

    # Sort matches by similarity score descending
    matches.sort(key=lambda m: m["similarity_score"], reverse=True)

    return {
        "matches": matches[:10],
        "highest_score": round(highest_score, 3),
        "duplicate_suspected": duplicate_suspected,
        "cross_bureau_overlap_suspected": cross_bureau_overlap_suspected
    }
