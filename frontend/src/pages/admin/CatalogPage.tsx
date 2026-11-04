import { useAdminData } from "@hooks/useAdminData";
import { useState } from "react";
import { api } from "@services/api";
import { AdminState, DataTable } from "./LiveAdmin";

type Row = Record<string, unknown>;
const fields: Record<string, string[]> = {
  domains: ["stage_id", "code", "name"],
  topics: ["subject_id", "code", "name"],
  objectives: ["topic_id", "code", "description"],
  questions: [
    "activity_id",
    "prompt",
    "question_type",
    "points",
    "display_order",
    "configuration",
  ],
  options: [
    "question_id",
    "text",
    "is_correct",
    "display_order",
    "configuration",
    "image_url",
  ],
};
export default function CatalogPage() {
  const [kind, setKind] = useState("domains");
  const [parent, setParent] = useState("");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const choicePath: Record<string, string> = {
    domains: "/admin/stages",
    topics: "/admin/subjects?limit=100",
    objectives: "/admin/catalog/topics?limit=100",
    questions: "/admin/activities?limit=100",
    options: "/admin/catalog/questions?limit=100",
  };
  const choices = useAdminData<Row[] | { items: Row[] }>(choicePath[kind]);
  const choicesList = Array.isArray(choices.data)
    ? choices.data
    : choices.data?.items || [];
  const r = useAdminData<{ items: Row[]; total: number }>(
    `/admin/catalog/${kind}?limit=25&offset=${offset}${parent ? `&parent_id=${parent}` : ""}`,
  );
  const changeKind = (k: string) => {
    setKind(k);
    setForm({});
    setEditing(null);
    setParent("");
    setOffset(0);
    setMessage("");
  };
  const save = async () => {
    setMessage("");
    try {
      const payload: Row = {};
      for (const k of fields[kind]) {
        const value = form[k] ?? "";
        if (k === "configuration") payload[k] = JSON.parse(value || "{}");
        else if (k === "is_correct") payload[k] = value === "true";
        else if (k.endsWith("_id") || ["points", "display_order"].includes(k))
          payload[k] = Number(value || (["points"].includes(k) ? 1 : 0));
        else if (value) payload[k] = value;
      }
      if (editing) await api.put(`/admin/catalog/${kind}/${editing}`, payload);
      else await api.post(`/admin/catalog/${kind}`, payload);
      setMessage("Saved.");
      setForm({});
      setEditing(null);
      await r.reload();
    } catch {
      setMessage(
        "Not saved. Check the required fields and linked record. Configuration must be valid JSON.",
      );
    }
  };
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Curriculum structure and tasks</h1>
      <p>
        Choose the related learning content, then create or edit its structure
        and tasks.
      </p>
      <label>
        Collection
        <select
          aria-label="Collection"
          className="input"
          value={kind}
          onChange={(e) => changeKind(e.target.value)}
        >
          {Object.keys(fields).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <label>
        Filter by parent record
        <input
          type="number"
          min={1}
          className="input"
          value={parent}
          onChange={(e) => {
            setParent(e.target.value);
            setOffset(0);
          }}
        />
      </label>
      <AdminState error={r.error} loading={!r.data}>
        <DataTable
          rows={r.data?.items || []}
          columns={[
            ["id", "Record"],
            ...fields[kind]
              .filter((k) => k !== "configuration")
              .map((k) => [k, k.replace(/_/g, " ")] as [string, string]),
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {r.data?.items.map((row) => (
            <button
              key={String(row.id)}
              className="btn btn-secondary"
              onClick={() => {
                setEditing(Number(row.id));
                const f: Record<string, string> = {};
                fields[kind].forEach(
                  (k) =>
                    (f[k] =
                      typeof row[k] === "object"
                        ? JSON.stringify(row[k] || {})
                        : String(row[k] ?? "")),
                );
                setForm(f);
              }}
            >
              Edit {String(row.id)}
            </button>
          ))}
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
          disabled={offset + 25 >= (r.data?.total || 0)}
          onClick={() => setOffset(offset + 25)}
        >
          Next
        </button>
      </div>
      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2 className="text-xl font-bold">
          {editing ? `Edit ${editing}` : `Add ${kind}`}
        </h2>
        {fields[kind].map((k) => (
          <label key={k} className="block">
            {k.replace(/_/g, " ")}
            {k.endsWith("_id") ? (
              <select
                aria-label={k}
                className="input"
                required
                value={form[k] || ""}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              >
                <option value="">Choose a linked record</option>
                {choicesList.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {String(r.name || r.title || r.prompt || r.code || r.id)}
                  </option>
                ))}
              </select>
            ) : k === "is_correct" ? (
              <select
                aria-label={k}
                className="input"
                value={form[k] || "false"}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            ) : (
              <input
                aria-label={k}
                className="input"
                required={
                  !["configuration", "image_url", "display_order"].includes(k)
                }
                value={form[k] || ""}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            )}
          </label>
        ))}
        <button className="btn btn-primary">Save record</button>
        {editing && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditing(null);
              setForm({});
            }}
          >
            Cancel editing
          </button>
        )}
        {message && <p role="status">{message}</p>}
      </form>
      <ObjectiveLinks />
    </div>
  );
}

function ObjectiveLinks() {
  const lessons = useAdminData<Row[]>("/admin/lessons?limit=100");
  const objectives = useAdminData<{ items: Row[] }>(
    "/admin/catalog/objectives?limit=100",
  );
  const [lesson, setLesson] = useState("");
  const [ids, setIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.put(`/admin/lessons/${lesson}/objectives`, {
            objective_ids: ids,
          });
          setMessage("Learning objectives assigned.");
        } catch {
          setMessage("Choose objectives from the same topic as the lesson.");
        }
      }}
    >
      <h2 className="text-xl font-bold">Assign learning objectives</h2>
      <label className="block">
        Lesson
        <select
          className="input"
          required
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
        >
          <option value="">Choose a lesson</option>
          {lessons.data?.map((r) => (
            <option key={String(r.id)} value={String(r.id)}>
              {String(r.title)}
            </option>
          ))}
        </select>
      </label>
      {objectives.data?.items.map((r) => (
        <label className="flex gap-3" key={String(r.id)}>
          <input
            type="checkbox"
            checked={ids.includes(Number(r.id))}
            onChange={(e) =>
              setIds(
                e.target.checked
                  ? [...ids, Number(r.id)]
                  : ids.filter((i) => i !== r.id),
              )
            }
          />
          {String(r.description)}
        </label>
      ))}
      <button className="btn btn-primary">Assign objectives</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
