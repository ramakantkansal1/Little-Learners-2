import { useEffect, useState } from "react";
import { parentApi, type ParentProfile } from "@services/api";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    parentApi
      .getMyProfile()
      .then((r) => setProfile(r.data))
      .catch(() => setError("Account details could not be loaded."));
  }, []);
  return (
    <section className="card p-6 space-y-4">
      <h1 className="text-3xl font-bold">Account settings</h1>
      {error && <p role="alert">{error}</p>}
      {profile ? (
        <dl>
          <dt>Name</dt>
          <dd>{profile.full_name}</dd>
          <dt>Email</dt>
          <dd>{profile.email}</dd>
          <dt>Phone</dt>
          <dd>{profile.phone_number || "Not provided"}</dd>
        </dl>
      ) : (
        !error && <p role="status">Loading account details…</p>
      )}
      <p>
        Choose a child to manage their stage, language, login and completion
        rewards.
      </p>
      <Link className="btn btn-primary" to="/parent/children">
        Manage children
      </Link>
      <p>
        Additional account, notification and privacy controls will be available
        in the settings phase.
      </p>
    </section>
  );
}
