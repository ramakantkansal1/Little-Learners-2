with open('adaptive_learning.py', 'r') as f:
    content = f.read()

new_class = '''@dataclass
class RecommendationResult:
    """Result of a next-activity recommendation.

    All fields are read-only derived values. No state is mutated.
    """

    activity_id: Optional[int]
    reason: str
    confidence: str  # "low", "medium", "high"
    mastery_score: Optional[float]
    tier: Optional[str]  # "remediate", "maintain", "advance", "cold_start"

    def to_dict(self) -> dict:
        return {
            "activity_id": self.activity_id,
            "reason": self.reason,
            "confidence": self.confidence,
            "mastery_score": self.mastery_score,
            "tier": self.tier,
        }

'''

marker = 'class RecommendationService:'
idx = content.find(marker)
if idx >= 0:
    content = content[:idx] + new_class + content[idx:]
    with open('adaptive_learning.py', 'w') as f:
        f.write(content)
    print('RecommendationResult dataclass added successfully')
else:
    print('class RecommendationService not found')
