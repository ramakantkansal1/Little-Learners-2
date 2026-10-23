with open('adaptive_learning.py', 'r') as f:
    content = f.read()

# Find the recommend_next_activity method
start_marker = '    async def recommend_next_activity('
start_idx = content.find(start_marker)
if start_idx == -1:
    print('Method not found')
    exit(1)

# Find the end of the method (next method or end of class)
end_idx = len(content)
for i in range(start_idx + 1, len(content)):
    if content[i:i+13] == '    async def ' and 'recommend_next_activity' not in content[i:i+30]:
        end_idx = i
        break
    if i > start_idx and content[i:i+8] == '\nclass ':
        end_idx = i
        break

if end_idx == len(content):
    # Check if we're at the end of the file
    pass

new_method = '''    async def recommend_next_activity(
        self,
        student_id: int,
        activity_id: int,
    ) -> RecommendationResult:
        """Recommend the next activity after completing one.

        Args:
            student_id: The student who completed the activity.
            activity_id: The activity that was just completed.

        Returns:
            RecommendationResult with the recommended activity ID or None,
            a human-readable reason, confidence level, mastery score, and tier.
        """
        # Get the attempt with its activity in a single query
        attempt_result = await self.db.execute(
            select(ActivityAttempt)
            .where(ActivityAttempt.activity_id == activity_id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
            .order_by(ActivityAttempt.completed_at.desc().nullslast())
            .limit(1)
        )
        attempt = attempt_result.scalar_one_or_none()

        if attempt is None:
            return RecommendationResult(
                activity_id=None,
                reason="attempt_not_found",
                confidence="low",
                mastery_score=None,
                tier=None,
            )

        # Get the activity separately
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
            )

        # Compute mastery from the attempt's responses
        responses = attempt.responses or []
        total_responses = len(responses)
        correct_responses = sum(1 for r in responses if r.is_correct is True)
        overall_accuracy = correct_responses / total_responses if total_responses > 0 else None
        has_evidence = total_responses > 0

        # Determine tier based on mastery
        if has_evidence and overall_accuracy is not None:
            if overall_accuracy < 0.60:
                tier = "remediate"
            elif overall_accuracy < 0.85:
                tier = "maintain"
            else:
                tier = "advance"
            confidence = "high" if total_responses >= 10 else "medium"
        else:
            tier = "cold_start"
            confidence = "low"

        # Get the current activity's lesson
        lesson_result = await self.db.execute(
            select(Lesson).where(Lesson.id == current_activity.lesson_id)
        )
        lesson = lesson_result.scalar_one_or_none()

        if lesson is None:
            return RecommendationResult(
                activity_id=None,
                reason="lesson_not_found",
                confidence="low",
                mastery_score=overall_accuracy,
                tier=tier,
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
                mastery_score=overall_accuracy,
                tier=tier,
            )

        # Strategy 2: Same lesson, next activity by display_order
        candidate = await self._find_next_in_lesson(
            student_id, lesson.id, current_activity.display_order, tier
        )
        if candidate:
            reason = self._build_reason(tier, mastery)
            return RecommendationResult(
                activity_id=candidate.id,
                reason=reason,
                confidence=confidence,
                mastery_score=overall_accuracy,
                tier=tier,
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
                reason = self._build_reason(tier, mastery)
                return RecommendationResult(
                    activity_id=candidate.id,
                    reason=reason,
                    confidence=confidence,
                    mastery_score=overall_accuracy,
                    tier=tier,
                )

        # Strategy 4: Same stage, first activity
        stage_id = student.current_stage_id if student else None
        if stage_id:
            candidate = await self._find_first_in_stage(student_id, stage_id, tier)
            if candidate:
                reason = self._build_reason(tier, mastery)
                return RecommendationResult(
                    activity_id=candidate.id,
                    reason=reason,
                    confidence=confidence,
                    mastery_score=overall_accuracy,
                    tier=tier,
                )

        return RecommendationResult(
            activity_id=None,
            reason="no_more_activities",
            confidence="low",
            mastery_score=overall_accuracy,
            tier=tier,
        )

'''

    new_lines = lines[:start_idx] + [new_method] + lines[end_idx:]
    with open('adaptive_learning.py', 'w') as f:
        f.write(''.join(new_lines))
    print('Replaced method successfully')