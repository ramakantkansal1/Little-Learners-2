with open('adaptive_learning.py', 'r') as f:
    content = f.read()

old = '''        attempt_result = await self.db.execute(
            select(ActivityAttempt)
            .where(ActivityAttempt.activity_id == activity_id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
            .order_by(ActivityAttempt.completed_at.desc())
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

        # Load the activity separately
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
        overall_accuracy = correct_responses / total_responses if total_responses > 0 else None'''

new = '''        attempt_result = await self.db.execute(
            select(ActivityAttempt)
            .options(selectinload(ActivityAttempt.responses))
            .where(ActivityAttempt.activity_id == activity_id)
            .where(ActivityAttempt.student_id == student_id)
            .where(ActivityAttempt.status == "completed")
            .order_by(ActivityAttempt.completed_at.desc())
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

        # Load the activity separately
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
        total_responses = len(attempt.responses)
        correct_responses = sum(1 for r in attempt.responses if r.is_correct is True)
        overall_accuracy = correct_responses / total_responses if total_responses > 0 else None'''

if old in content:
    content = content.replace(old, new, 1)
    with open('adaptive_learning.py', 'w') as f:
        f.write(content)
    print('Fixed attempt loading with selectinload')
else:
    print('Old text not found')
    # Debug: show what's around line 270
    with open('adaptive_learning.py', 'r') as f:
        lines = f.readlines()
    for i, line in enumerate(lines[268:282], start=129):
        print(f'{i+1}: {repr(lines[i])}')
