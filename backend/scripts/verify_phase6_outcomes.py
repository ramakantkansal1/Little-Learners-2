"""Read-only verification of a Phase 6 test child's persisted MySQL outcomes."""

import argparse
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine


async def verify(student_id):
    if settings.APP_ENV != "e2e":
        raise RuntimeError("Use the isolated E2E database")
    engine.echo = False
    async with engine.connect() as db:
        name = (
            await db.execute(
                text("SELECT username FROM student_profiles WHERE id=:id"), {"id": student_id}
            )
        ).scalar_one()
        assert name.startswith("phase6_"), "Only Phase 6 test accounts are accepted"
        summary = (
            (
                await db.execute(
                    text(
                        """
            SELECT COUNT(*) AS completed_attempts, COUNT(DISTINCT activity_id) AS completed_activities,
                   SUM(time_spent_seconds) AS seconds, MIN(score) AS lowest_score, MAX(score) AS highest_score
            FROM activity_attempts WHERE student_id=:id AND status='completed'
        """
                    ),
                    {"id": student_id},
                )
            )
            .mappings()
            .one()
        )
        assert summary["completed_activities"] >= 15
        assert summary["seconds"] > 0
        assert 0 <= summary["lowest_score"] <= summary["highest_score"] <= 100
        duplicates = (
            await db.execute(
                text(
                    """
            SELECT COUNT(*) FROM (
              SELECT reward_id, award_key FROM student_reward_awards WHERE student_id=:id
              GROUP BY reward_id, award_key HAVING COUNT(*)>1
            ) duplicates
        """
                ),
                {"id": student_id},
            )
        ).scalar_one()
        assert duplicates == 0
        stars = (
            await db.execute(
                text(
                    """
            SELECT COUNT(*) FROM student_reward_awards a JOIN student_rewards r ON r.id=a.reward_id
            WHERE a.student_id=:id AND r.code='completion_star'
        """
                ),
                {"id": student_id},
            )
        ).scalar_one()
        assert stars == summary["completed_activities"]
        duplicate_answers = (
            await db.execute(
                text(
                    """
            SELECT COUNT(*) FROM (
              SELECT r.attempt_id,r.question_id FROM activity_responses r
              JOIN activity_attempts a ON a.id=r.attempt_id WHERE a.student_id=:id
              GROUP BY r.attempt_id,r.question_id HAVING COUNT(*)>1
            ) duplicates
        """
                ),
                {"id": student_id},
            )
        ).scalar_one()
        assert duplicate_answers == 0
        print(
            json.dumps(
                {
                    "student_id": student_id,
                    **dict(summary),
                    "completion_stars": stars,
                    "duplicate_awards": duplicates,
                    "duplicate_answers": duplicate_answers,
                },
                default=str,
            )
        )
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--student-id", type=int, required=True)
    asyncio.run(verify(parser.parse_args().student_id))
