import { useState } from "react";
import { api } from "@services/api";
import { useAdminData } from "@hooks/useAdminData";
import { AdminState } from "./LiveAdmin";
interface Media {
  id: number;
  original_name: string;
  file_url: string;
  media_type: string;
  alt_text: string;
  license: string;
  source: string;
}
export default function MediaPage() {
  const list = useAdminData<Media[]>("/media?limit=50");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Media library</h1>
      <AdminState error={list.error} loading={!list.data}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data?.map((m) => (
            <article key={m.id} className="card p-4">
              {m.media_type === "image" && (
                <img
                  className="h-32 w-full object-contain"
                  src={m.file_url}
                  alt={m.alt_text || m.original_name}
                  loading="lazy"
                />
              )}
              <h2 className="font-semibold break-all">{m.original_name}</h2>
              <p>{m.license || "Licence not recorded"}</p>
              <label>
                Asset URL
                <input className="input" readOnly value={m.file_url} />
              </label>
            </article>
          ))}
        </div>
        {!list.data?.length && <p>No media has been uploaded.</p>}
      </AdminState>
      <form
        className="card space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          setBusy(true);
          setMessage("");
          const fields = new FormData(e.currentTarget);
          fields.set("file", file);
          fields.set(
            "media_type",
            file.type.startsWith("image/") ? "image" : "audio",
          );
          try {
            await api.post("/media/upload", fields, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            await list.reload();
            setMessage("Upload saved.");
          } catch {
            setMessage(
              "Upload failed. Check the file type, size and licence information.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-xl font-bold">Upload learning media</h2>
        <label className="block">
          File
          <input
            className="input"
            type="file"
            accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,audio/ogg"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {[
          ["alt_text", "Description / text alternative"],
          ["source", "Source or creator"],
          ["license", "Licence"],
          ["attribution", "Attribution"],
        ].map(([k, label]) => (
          <label className="block" key={k}>
            {label}
            <input name={k} className="input" required={k !== "attribution"} />
          </label>
        ))}
        <label className="block">
          Language
          <select name="language" className="input">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </label>
        <button disabled={busy} className="btn btn-primary">
          {busy ? "Uploading…" : "Upload media"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </div>
  );
}
