import { useAdminData } from "@hooks/useAdminData";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "@services/api";

type Row = Record<string, unknown>;
export function AdminState({
  error,
  loading,
  children,
}: {
  error: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4">
          {error}
        </p>
      )}
      {loading && !error ? <p role="status">Loading…</p> : children}
    </>
  );
}
export function DataTable({
  rows,
  columns,
}: {
  rows: Row[];
  columns: Array<[string, string]>;
}) {
  if (!rows.length) return <p className="p-4">No records match this view.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th className="border-b p-3" key={key}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              {columns.map(([key]) => (
                <td key={key} className="max-w-sm break-words border-b p-3">
                  {typeof r[key] === "boolean"
                    ? r[key]
                      ? "Yes"
                      : "No"
                    : String(r[key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Dashboard() {
  const { data, error } =
    useAdminData<Record<string, number>>("/admin/dashboard");
  const logs = useAdminData<Row[]>("/admin/audit-logs?limit=8");
  const labels: Record<string, string> = {
    total_parents: "Registered parents",
    total_children: "Child profiles",
    active_accounts: "Active accounts",
    published_lessons: "Published lessons",
    total_activities: "Activities",
    activities_completed: "Completed attempts",
    content_pending_review: "Awaiting review",
    recent_registrations: "Registrations this week",
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin dashboard</h1>
      <AdminState error={error} loading={!data}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(data || {}).map(([k, v]) => (
            <div key={k} className="card p-5">
              <p>{labels[k] || k}</p>
              <strong className="text-3xl">{v}</strong>
            </div>
          ))}
        </div>
      </AdminState>
      <section className="card p-5">
        <h2 className="text-xl font-bold">Recent administrative actions</h2>
        <DataTable
          rows={logs.data || []}
          columns={[
            ["action", "Action"],
            ["resource_type", "Area"],
            ["created_at", "When"],
          ]}
        />
      </section>
      <Link className="btn btn-primary" to="/admin/curriculum">
        Manage curriculum
      </Link>
    </div>
  );
}
export function Users() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const list = useAdminData<Row[]>(
    `/admin/users?limit=25&offset=${offset}&search=${encodeURIComponent(query)}`,
  );
  const update = async (id: number, payload: Row) => {
    setError("");
    try {
      await api.patch(`/admin/users/${id}`, payload);
      await list.reload();
    } catch {
      setError(
        "The account could not be updated. You cannot suspend yourself or remove your own administrator access.",
      );
    }
  };
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Accounts and permissions</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setQuery(search);
        }}
        className="flex gap-3"
      >
        <input
          aria-label="Search accounts"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary">Search</button>
      </form>
      <AdminState error={error || list.error} loading={!list.data}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="border-b">
                  <td className="p-3">{String(r.parent_name || r.email)}</td>
                  <td>
                    <select
                      aria-label={`Role for ${r.email}`}
                      className="input"
                      value={String(r.role)}
                      onChange={(e) =>
                        void update(Number(r.id), { role: e.target.value })
                      }
                    >
                      {["parent", "student", "admin"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                  <td>{r.is_active ? "Active" : "Suspended"}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        void update(Number(r.id), { is_active: !r.is_active })
                      }
                    >
                      {r.is_active ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminState>
      <div className="flex gap-3">
        <button
          className="btn btn-secondary"
          disabled={!offset}
          onClick={() => setOffset(offset - 25)}
        >
          Previous
        </button>
        <button
          className="btn btn-secondary"
          disabled={(list.data?.length || 0) < 25}
          onClick={() => setOffset(offset + 25)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function Children() {
  const [offset, setOffset] = useState(0);
  const r = useAdminData<Row[]>(`/admin/children?limit=25&offset=${offset}`);
  const stages = useAdminData<Row[]>("/admin/stages");
  const [message, setMessage] = useState("");
  const save = async (id: number, data: Row) => {
    try {
      await api.patch(`/admin/children/${id}`, data);
      setMessage("Child profile updated.");
      await r.reload();
    } catch {
      setMessage("The profile could not be updated.");
    }
  };
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Child profiles</h1>
      <p>Only the display name, learning stage and account status are shown.</p>
      <AdminState error={r.error} loading={!r.data}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Child</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.map((c) => (
                <tr key={String(c.id)}>
                  <td className="p-3">{String(c.display_name)}</td>
                  <td>
                    <select
                      className="input"
                      aria-label={`Stage for ${c.display_name}`}
                      value={String(c.stage_id || "")}
                      onChange={(e) =>
                        void save(Number(c.id), {
                          current_stage_id: Number(e.target.value),
                        })
                      }
                    >
                      <option value="">Choose stage</option>
                      {stages.data?.map((s) => (
                        <option key={String(s.id)} value={String(s.id)}>
                          {String(s.name)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        void save(Number(c.id), { is_active: !c.is_active })
                      }
                    >
                      {c.is_active ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminState>
      <button
        className="btn btn-secondary"
        disabled={!offset}
        onClick={() => setOffset(offset - 25)}
      >
        Previous
      </button>
      <button
        className="btn btn-secondary"
        disabled={(r.data?.length || 0) < 25}
        onClick={() => setOffset(offset + 25)}
      >
        Next
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export function Audit() {
  const [offset, setOffset] = useState(0);
  const r = useAdminData<Row[]>(`/admin/audit-logs?limit=25&offset=${offset}`);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Audit logs</h1>
      <AdminState error={r.error} loading={!r.data}>
        <DataTable
          rows={r.data || []}
          columns={[
            ["created_at", "When"],
            ["action", "Action"],
            ["resource_type", "Area"],
            ["resource_id", "Record"],
            ["success", "Succeeded"],
          ]}
        />
      </AdminState>
      <div className="flex gap-3">
        <button
          className="btn btn-secondary"
          disabled={!offset}
          onClick={() => setOffset(offset - 25)}
        >
          Previous
        </button>
        <button
          className="btn btn-secondary"
          disabled={(r.data?.length || 0) < 25}
          onClick={() => setOffset(offset + 25)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function Analytics() {
  const [days, setDays] = useState(30);
  const r = useAdminData<Record<string, Row[] | number>>(
    `/admin/analytics?days=${days}`,
  );
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Platform analytics</h1>
      <label>
        Period
        <select
          aria-label="Analytics period"
          className="input"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </label>
      <AdminState error={r.error} loading={!r.data}>
        {Object.entries(r.data || {}).map(([key, value]) => (
          <section key={key} className="card p-5">
            <h2 className="text-xl font-bold">{key.replace(/_/g, " ")}</h2>
            {Array.isArray(value) ? (
              <DataTable
                rows={value}
                columns={Object.keys(value[0] || {}).map((k) => [
                  k,
                  k.replace(/_/g, " "),
                ])}
              />
            ) : (
              <p>{value} minutes</p>
            )}
          </section>
        ))}
      </AdminState>
    </div>
  );
}
export function Settings() {
  const r = useAdminData<Row>("/admin/platform-settings");
  const [form, setForm] = useState<Row>({});
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (r.data) setForm(r.data);
  }, [r.data]);
  return (
    <form
      className="card space-y-5 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        try {
          await api.put("/admin/platform-settings", form);
          setMessage("Settings saved.");
        } catch {
          setMessage(
            "Settings were not saved. Keep at least one language enabled.",
          );
        }
      }}
    >
      <h1 className="text-3xl font-bold">Platform settings and languages</h1>
      <AdminState error={r.error} loading={!r.data}>
        {["application_name", "support_email"].map((k) => (
          <label className="block" key={k}>
            {k.replace(/_/g, " ")}
            <input
              className="input"
              required={k === "application_name"}
              value={String(form[k] || "")}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </label>
        ))}
        {["english_enabled", "hindi_enabled"].map((k) => (
          <label key={k} className="flex gap-3">
            <input
              type="checkbox"
              checked={Boolean(form[k])}
              onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
            />
            {k === "english_enabled" ? "English" : "Hindi"}
          </label>
        ))}
        <button className="btn btn-primary">Save platform settings</button>
      </AdminState>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
