import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { parentApi } from "@services/api";

interface Report {
  child_name: string;
  stage_name: string;
  completed_lessons: number;
  total_lessons: number;
  completed_activities: number;
  total_time_spent_seconds: number;
  average_score: number | null;
  rewards_earned: number;
  rewards_enabled: boolean;
  subjects: Array<{
    name: string;
    completed_lessons: number;
    total_lessons: number;
  }>;
  recent_activity: Array<{
    lesson: string;
    activity: string;
    completed_at: string;
    score: number | null;
    time_spent: number;
  }>;
}

export default function ChildProgressPage() {
  const { childId } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setReport(null);
    setError("");
    let active = true;
    parentApi
      .getChildProgress(Number(childId))
      .then((r) => {
        if (active) setReport(r.data);
      })
      .catch(() => {
        if (active)
          setError(
            "Progress could not be loaded. Please refresh to try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [childId]);
  const toggleRewards = async () => {
    if (!report) return;
    const previous = report;
    setReport({ ...report, rewards_enabled: !report.rewards_enabled });
    setSaving(true);
    setError("");
    try {
      await parentApi.updateChild(Number(childId), {
        rewards_enabled: !report.rewards_enabled,
      });
    } catch {
      setReport(previous);
      setError("Reward preferences were not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  if (!report)
    return (
      <p role={error ? "alert" : "status"}>{error || "Loading progress…"}</p>
    );
  return (
    <div className="min-w-0 space-y-6" style={{ overflowWrap: "anywhere" }}>
      <Link to="/parent/children" className="btn btn-secondary">
        My Children
      </Link>
      <h1 className="text-3xl font-bold">{report.child_name}'s Progress</h1>
      <p>{report.stage_name}</p>
      {error && <p role="alert">{error}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          Lessons completed
          <p className="text-2xl">
            {report.completed_lessons} / {report.total_lessons}
          </p>
        </div>
        <div className="card p-5">
          Activities completed
          <p className="text-2xl">{report.completed_activities}</p>
        </div>
        <div className="card p-5">
          Learning time
          <p className="text-2xl">
            {Math.floor(report.total_time_spent_seconds / 60)} min{" "}
            {report.total_time_spent_seconds % 60} sec
          </p>
        </div>
        <div className="card p-5">
          Rewards earned<p className="text-2xl">{report.rewards_earned}</p>
        </div>
      </div>
      <section className="card p-6">
        <h2 className="text-xl font-bold">Completion celebrations</h2>
        <p>
          Stars, stickers and milestones celebrate participation. There are no
          daily streak requirements.
        </p>
        <label className="flex gap-3 mt-4">
          <input
            type="checkbox"
            checked={report.rewards_enabled}
            disabled={saving}
            onChange={toggleRewards}
          />{" "}
          Enable rewards for this child
        </label>
      </section>
      <section className="card p-6">
        <h2 className="text-xl font-bold">Subject progress</h2>
        {!report.subjects.length && (
          <p>No published lessons are available for this stage yet.</p>
        )}
        {report.subjects.map((s) => (
          <div key={s.name} className="py-3">
            <p>
              {s.name}: {s.completed_lessons} / {s.total_lessons} lessons
              completed
            </p>
            <progress
              className="w-full"
              value={s.completed_lessons}
              max={s.total_lessons || 1}
              aria-label={`${s.name} completion`}
            />
          </div>
        ))}
      </section>
      <section className="card p-6">
        <h2 className="text-xl font-bold">Recent learning</h2>
        {!report.recent_activity.length && (
          <p>
            Completed activities will appear here after your child starts
            learning.
          </p>
        )}
        <ul>
          {report.recent_activity.map((a, i) => (
            <li key={`${a.completed_at}-${i}`} className="border-b py-4">
              <p className="font-semibold">
                {a.lesson} · {a.activity}
              </p>
              <p>
                {new Date(
                  a.completed_at + (a.completed_at.endsWith("Z") ? "" : "Z"),
                ).toLocaleString()}{" "}
                · {a.time_spent} sec
              </p>
              {a.score !== null && (
                <p>
                  {a.score}% · {a.score < 70 ? "Practising" : "Completed"}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
