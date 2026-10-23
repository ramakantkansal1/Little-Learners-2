from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSession
from app.models import Activity, ActivityAttempt, ActivityResponse, Lesson, Topic, Subject, StudentProfile, ActivityTypeEnum, ContentStatusEnum


MIN_ATTEMPTS_FOR_SIGNAL = 3
REVIEW_INTERVAL_DAYS = 7


@dataclass
class ActivityTypePerformance:
    activity_type: str
    accuracy: float
    completed_attempts: int = 0
    total_responses: int = 0
    correct_responses: int = 0
    has_evidence: bool = False


@dataclass
class RecommendationResult:
    activity_id: Optional[int]
    reason: str
    confidence: str
    mastery_score: Optional[float]
    tier: str
    has_evidence: bool


class MasteryService:
    """Read-only service that computes observational performance signals from existing attempt and response data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student_attempt_summary(
        self, student_id: int, history_limit: int = 10
    ):
        """Get student attempt summary for mastery assessment."""
        attempts_result = await self.db.execute(
            select(ActivityAttempt)
            .options(selectinload(ActivityAttempt.activity))
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
            .order_by(ActivityAttempt.completed_at.desc().nullslast())
            .limit(history_limit)
        )
        attempts = attempts_result.scalars().all()

        total_completed_attempts = len(attempts)
        total_responses = 0
        correct_responses = 0

        for attempt in attempts:
            responses = attempt.responses or []
            total_responses += len(responses)
            correct_responses += sum(1 for r in responses if r.is_correct is True)

        overall_accuracy = correct_responses / total_responses if total_responses > 0 else None

        has_evidence = total_completed_attempts >= MIN_ATTEMPTS_FOR_SIGNAL

        by_type: Dict[str, dict] = {}
        for attempt in attempts:
            responses = attempt.responses or []
            atype = attempt.activity.type.value if attempt.activity else None
            if atype not in by_type:
                by_type[atype] = {"accuracy": 0, "total": 0, "correct": 0, "completed_attempts": 0, "total_responses": 0, "correct_responses": 0}
            by_type[atype]["total"] += len(responses)
            by_type[atype]["correct"] += sum(1 for r in responses if r.is_correct is True)
            by_type[atype]["completed_attempts"] += 1
            by_type[atype]["total_responses"] += len(responses)
            by_type[atype]["correct_responses"] += sum(1 for r in responses if r.is_correct is True)

        type_performances = []
        for atype, data in by_type.items():
            if data["total"] > 0:
                type_performances.append(
                    ActivityTypePerformance(
                        activity_type=atype,
                        accuracy=data["correct"] / data["total"],
                        completed_attempts=data["completed_attempts"],
                        total_responses=data["total_responses"],
                        correct_responses=data["correct_responses"],
                        has_evidence=data["completed_attempts"] >= MIN_ATTEMPTS_FOR_SIGNAL,
                    )
                )

        class Summary:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        return Summary(
            student_id=student_id,
            total_completed_attempts=total_completed_attempts,
            total_responses=total_responses,
            correct_responses=correct_responses,
            overall_accuracy=overall_accuracy,
            has_evidence=has_evidence,
            by_activity_type=type_performances,
        )


class RecommendationService:
    """Read-only service that computes observational performance signals from existing attempt and response data.

    All methods are read-only: they perform SELECT queries only and never mutate
    attempt, progress, reward, or streak state.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.REVIEW_INTERVAL_DAYS = REVIEW_INTERVAL_DAYS

    async def recommend_next_activity(
        self,
        student_id: int,
        activity_id: int,
    ) -> RecommendationResult:
        """Recommend next activity based on student's mastery and review status."""

        # Find the most recent completed attempt for this activity
        attempt_result = await self.db.execute(
            select(ActivityAttempt)
            .options(selectinload(ActivityAttempt.activity))
            .where(ActivityAttempt.activity_id == activity_id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
            .order_by(ActivityAttempt.completed_at.desc().nullslast())
            .limit(1)
        )
        attempt = attempt_result.scalar_one_or_none()

        if not attempt:
            return RecommendationResult(
                activity_id=None,
                reason="attempt_not_found",
                confidence="low",
                mastery_score=None,
                tier=None,
                has_evidence=False,
            )

        # Get the activity
        activity_result = await self.db.execute(
            select(Activity).where(Activity.id == attempt.activity_id)
        )
        current_activity = activity_result.scalar_one_or_none()

        if current_activity is None:
            return RecommendationResult(
                activity_id=None,
                reason="activity_not_found",
                confidence="low",
                mastery_score=None,
                tier=None,
                has_evidence=False,
            )

        # Compute overall accuracy across ALL attempts for this student
        all_responses_result = await self.db.execute(
            select(ActivityResponse)
            .join(ActivityAttempt, ActivityResponse.attempt_id == ActivityAttempt.id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
        )
        all_responses = all_responses_result.scalars().all()
        total_responses_all = len(all_responses)
        correct_responses_all = sum(1 for r in all_responses if r.is_correct is True)
        overall_accuracy = correct_responses_all / total_responses_all if total_responses_all > 0 else None

        total_completed_attempts_result = await self.db.execute(
            select(func.count(ActivityAttempt.id))
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
        )
        total_completed_attempts = total_completed_attempts_result.scalar() or 0
        has_evidence = total_completed_attempts >= MIN_ATTEMPTS_FOR_SIGNAL

        if not has_evidence or overall_accuracy is None:
            tier = "cold_start"
            confidence = "low"
        elif overall_accuracy < 0.60:
            tier = "remediate"
            confidence = "high"
        elif overall_accuracy < 0.85:
            tier = "maintain"
            confidence = "medium"
        else:
            tier = "advance"
            confidence = "high"

        # Get lesson info
        lesson_result = await self.db.execute(
            select(Lesson)
            .options(selectinload(Lesson.topic).selectinload(Topic.subject))
            .where(Lesson.id == current_activity.lesson_id)
        )
        lesson = lesson_result.scalar_one_or_none()

        if lesson is None:
            return RecommendationResult(
                activity_id=None,
                reason="lesson_not_found",
                confidence="low",
                mastery_score=overall_accuracy if has_evidence else None,
                tier=tier,
                has_evidence=has_evidence,
            )

        # Strategy 1: Check for review-eligible activities (spaced repetition)
        review_candidate = await self._find_review_candidate(
            student_id,
            lesson.topic.subject.stage_id if lesson.topic and lesson.topic.subject else None,
        )
        if review_candidate:
            return RecommendationResult(
                activity_id=review_candidate.id,
                reason="review_overdue",
                confidence="medium",
                mastery_score=overall_accuracy if has_evidence else None,
                tier=tier,
                has_evidence=has_evidence,
            )

        # Strategy 2: Same lesson, next activity by display_order
        candidate = await self._find_next_in_lesson(
            student_id, lesson.id, current_activity.display_order, tier
        )
        if candidate:
            reason = self._build_reason(tier, None)
            return RecommendationResult(
                activity_id=candidate.id,
                reason=reason,
                confidence=confidence,
                mastery_score=overall_accuracy if has_evidence else None,
                tier=tier,
                has_evidence=has_evidence,
            )

        # Strategy 3: Same topic, next lesson
        topic_result = await self.db.execute(
            select(Topic).where(Topic.id == lesson.topic_id)
        )
        topic = topic_result.scalar_one_or_none()

        if topic:
            candidate = await self._find_next_in_topic(
                student_id, topic.id, lesson.display_order, tier
            )
            if candidate:
                reason = self._build_reason(tier, None)
                return RecommendationResult(
                    activity_id=candidate.id,
                    reason=reason,
                    confidence=confidence,
                    mastery_score=overall_accuracy if has_evidence else None,
                    tier=tier,
                    has_evidence=has_evidence,
                )

        # Strategy 4: Same stage, first activity
        student_result = await self.db.execute(
            select(StudentProfile).where(StudentProfile.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        stage_id = student.current_stage_id if student else None
        if stage_id:
            candidate = await self._find_first_in_stage(student_id, stage_id, tier)
            if candidate:
                return RecommendationResult(
                    activity_id=candidate.id,
                    reason=self._build_reason(tier, None),
                    confidence="medium",
                    mastery_score=overall_accuracy if has_evidence else None,
                    tier=tier,
                    has_evidence=has_evidence,
                )

        return RecommendationResult(
            activity_id=None,
            reason="no_more_activities",
            confidence="low",
            mastery_score=overall_accuracy if has_evidence else None,
            tier=tier,
            has_evidence=has_evidence,
        )

    async def _find_review_candidate(
        self,
        student_id: int,
        stage_id: Optional[int],
    ) -> Optional[Activity]:
        """Find an activity due for review (completed > REVIEW_INTERVAL_DAYS ago)."""
        cutoff = datetime.utcnow() - timedelta(days=self.REVIEW_INTERVAL_DAYS)

        # Get ALL completed attempts for this student, not just those <= cutoff
        # We need to find the most recent completion for each activity, then check if it's overdue
        attempts_result = await self.db.execute(
            select(ActivityAttempt)
            .options(selectinload(ActivityAttempt.activity))
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
            .order_by(ActivityAttempt.completed_at.asc())
        )
        attempts = attempts_result.scalars().all()

        activity_last_completed: Dict[int, datetime] = {}
        for attempt in attempts:
            if attempt.activity_id not in activity_last_completed:
                activity_last_completed[attempt.activity_id] = attempt.completed_at
            else:
                if attempt.completed_at > activity_last_completed[attempt.activity_id]:
                    activity_last_completed[attempt.activity_id] = attempt.completed_at

        review_candidate_ids = [
            aid for aid, completed_at in activity_last_completed.items()
            if completed_at <= cutoff
        ]

        if not review_candidate_ids:
            return None

        result = await self.db.execute(
            select(Activity)
            .options(selectinload(Activity.lesson).selectinload(Lesson.topic).selectinload(Topic.subject))
            .where(Activity.id.in_(review_candidate_ids))
            .where(Activity.status == "published")
            .where(Activity.is_active == True)
        )
        activities = result.scalars().all()

        valid = []
        for activity in activities:
            if (
                activity.lesson
                and activity.lesson.topic
                and activity.lesson.topic.subject
                and (stage_id is None or activity.lesson.topic.subject.stage_id == stage_id)
            ):
                valid.append(activity)

        if not valid:
            return None

        valid.sort(
            key=lambda a: (
                a.lesson.topic.subject.display_order,
                a.lesson.display_order,
                a.display_order,
            )
        )
        return valid[0]

    async def _find_next_in_lesson(
        self,
        student_id: int,
        lesson_id: int,
        current_display_order: int,
        tier: str,
    ) -> Optional[Activity]:
        result = await self.db.execute(
            select(Activity)
            .where(Activity.lesson_id == lesson_id)
            .where(Activity.status == "published")
            .where(Activity.is_active == True)
            .where(Activity.display_order > current_display_order)
            .order_by(Activity.display_order)
        )
        activities = result.scalars().all()

        if not activities:
            return None

        completed_result = await self.db.execute(
            select(ActivityAttempt.activity_id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
        )
        completed_ids = {row[0] for row in completed_result.all()}

        cutoff = datetime.utcnow() - timedelta(days=self.REVIEW_INTERVAL_DAYS)
        review_eligible_ids: set = set()
        for aid in completed_ids:
            last_result = await self.db.execute(
                select(ActivityAttempt.completed_at)
                .where(ActivityAttempt.student_id == student_id)
                .where(ActivityAttempt.activity_id == aid)
                .where(ActivityAttempt.status == "completed")
                .order_by(ActivityAttempt.completed_at.desc())
                .limit(1)
            )
            last_completed = last_result.scalar_one_or_none()
            if last_completed and last_completed <= cutoff:
                review_eligible_ids.add(aid)

        next_activities = [a for a in activities if a.id not in completed_ids or a.id in review_eligible_ids]

        if not next_activities:
            return None

        return next_activities[0]

    async def _find_next_in_topic(
        self,
        student_id: int,
        topic_id: int,
        current_display_order: int,
        tier: str,
    ) -> Optional[Activity]:
        result = await self.db.execute(
            select(Activity)
            .join(Lesson, Activity.lesson_id == Lesson.id)
            .where(Lesson.topic_id == topic_id)
            .where(Activity.status == "published")
            .where(Activity.is_active == True)
            .where(Activity.display_order > current_display_order)
            .order_by(Activity.display_order)
        )
        activities = result.scalars().all()

        if not activities:
            return None

        completed_result = await self.db.execute(
            select(ActivityAttempt.activity_id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
        )
        completed_ids = {row[0] for row in completed_result.all()}

        cutoff = datetime.utcnow() - timedelta(days=self.REVIEW_INTERVAL_DAYS)
        review_eligible_ids: set = set()
        for aid in completed_ids:
            last_result = await self.db.execute(
                select(ActivityAttempt.completed_at)
                .where(ActivityAttempt.student_id == student_id)
                .where(ActivityAttempt.activity_id == aid)
                .where(ActivityAttempt.status == "completed")
                .order_by(ActivityAttempt.completed_at.desc())
                .limit(1)
            )
            last_completed = last_result.scalar_one_or_none()
            if last_completed and last_completed <= cutoff:
                review_eligible_ids.add(aid)

        next_activities = [a for a in activities if a.id not in completed_ids or a.id in review_eligible_ids]

        if not next_activities:
            return None

        return next_activities[0]

    async def _find_first_in_stage(
        self,
        student_id: int,
        stage_id: int,
        tier: str,
    ) -> Optional[Activity]:
        result = await self.db.execute(
            select(Activity)
            .join(Lesson, Activity.lesson_id == Lesson.id)
            .join(Topic, Lesson.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(Subject.stage_id == stage_id)
            .where(Activity.status == "published")
            .where(Activity.is_active == True)
            .order_by(Subject.display_order, Lesson.display_order, Activity.display_order)
        )
        activities = result.scalars().all()

        if not activities:
            return None

        # Check if any activity was recently completed
        cutoff = datetime.utcnow() - timedelta(days=self.REVIEW_INTERVAL_DAYS)
        for activity in activities:
            last_result = await self.db.execute(
                select(ActivityAttempt.completed_at)
                .where(ActivityAttempt.student_id == student_id)
                .where(ActivityAttempt.activity_id == activity.id)
                .where(ActivityAttempt.status == "completed")
                .order_by(ActivityAttempt.completed_at.desc())
                .limit(1)
            )
            last_completed = last_result.scalar_one_or_none()
            if last_completed and last_completed > cutoff:
                continue

        return activities[0] if activities else None

    def _build_reason(self, tier: str, mastery: Optional[object]) -> str:
        if tier == "cold_start":
            return "cold_start_sequence"
        if tier == "remediate":
            return "remediate_repeat"
        if tier == "maintain":
            return "maintain_practice"
        if tier == "advance":
            return "advance_next"
        return "curriculum_sequence"
