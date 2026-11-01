import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  User,
  Edit,
  Trash2,
  Loader2,
  Trophy,
  Copy,
  Check,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  parentApi,
  type Child,
  type ChildCreateRequest,
  type ChildUpdateRequest,
} from "@services";
import { useAuth } from "@hooks/useAuth";

// Schema for creating a new child - PIN is required
const childCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  age: z.coerce.number().min(2, "Minimum age is 2").max(6, "Maximum age is 6"),
  stage: z.string().min(1, "Please select a stage"),
  avatar: z.string().min(1, "Please select an avatar"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});

// Schema for editing an existing child - PIN is optional (leave blank to keep current)
const childUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  age: z.coerce.number().min(2, "Minimum age is 2").max(6, "Maximum age is 6"),
  stage: z.string().min(1, "Please select a stage"),
  avatar: z.string().min(1, "Please select an avatar"),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4-6 digits")
    .optional()
    .or(z.literal("")),
});

type ChildForm = z.infer<typeof childCreateSchema>;

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

const stages = [
  { id: 1, code: "playgroup", name: "Playgroup / Pre-Nursery (2-3)" },
  { id: 2, code: "nursery", name: "Nursery (3-4)" },
  { id: 3, code: "lkg", name: "LKG (4-5)" },
  { id: 4, code: "ukg", name: "UKG (5-6)" },
];

const avatars = [
  { value: "boy", label: "👦 Boy" },
  { value: "girl", label: "👧 Girl" },
  { value: "elephant", label: "🐘 Elephant" },
  { value: "owl", label: "🦉 Owl" },
  { value: "rabbit", label: "🐰 Rabbit" },
  { value: "tiger", label: "🐯 Tiger" },
];

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUsername, setCopiedUsername] = useState<number | null>(null);
  const { isLoading: authLoading } = useAuth();

  const handleCopyUsername = async (username: string, childId: number) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsername(childId);
      setTimeout(() => setCopiedUsername(null), 2000);
    } catch (err) {
      console.error("Failed to copy username:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = username;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedUsername(childId);
      setTimeout(() => setCopiedUsername(null), 2000);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChildForm>({
    resolver: zodResolver(editingChild ? childUpdateSchema : childCreateSchema),
    defaultValues: { pin: "" },
  });

  const loadChildren = async () => {
    try {
      setLoading(true);
      const response = await parentApi.getChildren();
      setChildren(response.data);
    } catch (err) {
      setError("Failed to load children");
      console.error("Load children error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadChildren();
    }
  }, [authLoading]);

  const openAddModal = () => {
    setEditingChild(null);
    reset({ name: "", age: undefined, stage: "", avatar: "boy", pin: "" });
    setShowModal(true);
  };

  const openEditModal = (child: Child) => {
    setEditingChild(child);
    reset({
      name: child.display_name,
      age: child.date_of_birth
        ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()
        : undefined,
      stage: child.current_stage_name || child.current_stage_code || "",
      avatar: child.avatar_type || "boy",
      pin: "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChild(null);
    reset({ name: "", age: undefined, stage: "", avatar: "boy", pin: "" });
  };

  const onSubmit = async (data: ChildForm) => {
    try {
      setSaving(true);
      setError(null);

      // Calculate date of birth from age
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - data.age);
      const dateOfBirth = dob.toISOString().split("T")[0];

      // Map avatar value to avatar_type
      const avatarTypeMap: Record<string, string> = {
        boy: "boy",
        girl: "girl",
        elephant: "elephant",
        owl: "owl",
        rabbit: "rabbit",
        tiger: "tiger",
      };

      // Map stage display name to stage code
      const stageCode =
        stages.find((s) => s.name === data.stage)?.code || data.stage;

      const stageId = stages.find((s) => s.code === stageCode)?.id || 1;

      if (editingChild) {
        // Update existing child
        const updateData: ChildUpdateRequest = {
          display_name: data.name,
          date_of_birth: dateOfBirth,
          current_stage_id: stageId,
          avatar_type: avatarTypeMap[data.avatar],
          pin: data.pin || undefined,
        };
        await parentApi.updateChild(editingChild.id, updateData);
      } else {
        // Create new child
        const createData: ChildCreateRequest = {
          display_name: data.name,
          date_of_birth: dateOfBirth,
          avatar_type: avatarTypeMap[data.avatar],
          current_stage_id: stageId,
          preferred_language: "en",
          pin: data.pin || undefined,
        };
        await parentApi.createChild(createData);
      }

      closeModal();
      await loadChildren();
    } catch (err) {
      setError("Failed to save child. Please try again.");
      console.error("Save child error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (childId: number) => {
    if (
      !confirm(
        "Are you sure you want to deactivate this child profile? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await parentApi.deactivateChild(childId);
      await loadChildren();
    } catch (err) {
      setError("Failed to deactivate child");
      console.error("Deactivate child error:", err);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarEmoji = (avatarType: string | undefined): string => {
    const avatarMap: Record<string, string> = {
      boy: "👦",
      girl: "👧",
      elephant: "🐘",
      owl: "🦉",
      rabbit: "🐰",
      tiger: "🐯",
    };
    return avatarMap[avatarType || "boy"] || "👦";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading children...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            My Children
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your children's profiles and learning stages
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn btn-primary"
          disabled={saving}
        >
          <Plus className="w-5 h-5" />
          Add Child
        </button>
      </div>

      {error && (
        <div
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {children.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
            No children added yet
          </h3>
          <p className="text-gray-600 mb-6">
            Add your first child to start their learning journey
          </p>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            Add Child
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <div key={child.id} className="card p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center text-3xl flex-shrink-0">
                  {getAvatarEmoji(child.avatar_type || undefined)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-display font-bold text-gray-900">
                      {child.display_name}
                    </h3>
                    <span className="badge badge-primary">
                      {child.current_stage_name ||
                        child.current_stage_code ||
                        "Unknown"}
                    </span>
                  </div>

                  {/* Username display with copy button */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Username
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-900 break-all">
                        {child.username}
                      </code>
                      <button
                        onClick={() =>
                          handleCopyUsername(child.username, child.id)
                        }
                        className="btn btn-ghost p-2 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        aria-label={`Copy ${child.username} to clipboard`}
                      >
                        {copiedUsername === child.id ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {copiedUsername === child.id && (
                      <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Copied to clipboard!
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-gray-500">
                    {child.date_of_birth
                      ? `Age ${new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()}`
                      : "Age unknown"}
                    • Last active: {formatLastActive(child.last_activity_at)}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full"
                  style={{ width: `${child.progress_percentage}%` }}
                />
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/parent/children/${child.id}`}
                  className="btn btn-primary flex-1 justify-center"
                >
                  View Progress
                </Link>
                <Link
                  to={`/parent/children/${child.id}/rewards`}
                  className="btn btn-secondary flex-1 justify-center"
                >
                  <Trophy className="w-5 h-5" />
                  Rewards
                </Link>
                <button
                  onClick={() => openEditModal(child)}
                  className="btn btn-ghost"
                  aria-label="Edit profile"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeactivate(child.id)}
                  className="btn btn-ghost text-red-500 hover:bg-red-50"
                  aria-label="Deactivate child"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Child Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">
                {editingChild ? "Edit Child" : "Add New Child"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="label">
                  Child's Name
                </label>
                <input
                  {...register("name")}
                  type="text"
                  id="name"
                  className={`input ${errors.name ? "input-error" : ""}`}
                  placeholder="Enter name"
                  required
                  disabled={saving}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="age" className="label">
                    Age
                  </label>
                  <select
                    {...register("age")}
                    id="age"
                    className={`input ${errors.age ? "input-error" : ""}`}
                    required
                    disabled={saving}
                  >
                    <option value="">Select age</option>
                    {Array.from({ length: 5 }, (_, i) => i + 2).map((age) => (
                      <option key={age} value={age}>
                        {age} years
                      </option>
                    ))}
                  </select>
                  {errors.age && (
                    <p className="mt-1.5 text-sm text-red-500">
                      {errors.age.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="stage" className="label">
                    Learning Stage
                  </label>
                  <select
                    {...register("stage")}
                    id="stage"
                    className={`input ${errors.stage ? "input-error" : ""}`}
                    required
                    disabled={saving}
                  >
                    <option value="">Select stage</option>
                    {stages.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.stage && (
                    <p className="mt-1.5 text-sm text-red-500">
                      {errors.stage.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="avatar" className="label">
                  Avatar
                </label>
                <select
                  {...register("avatar")}
                  id="avatar"
                  className={`input ${errors.avatar ? "input-error" : ""}`}
                  required
                  disabled={saving}
                >
                  {avatars.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {errors.avatar && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.avatar.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="pin" className="label">
                  {editingChild ? (
                    <>
                      New Student PIN (Optional)
                      <span className="text-sm text-gray-400 ml-2">
                        (4-6 digits for child login)
                      </span>
                    </>
                  ) : (
                    <>
                      Student PIN (Required)
                      <span className="text-sm text-gray-400 ml-2">
                        (4-6 digits for child login)
                      </span>
                    </>
                  )}
                </label>
                <input
                  {...register("pin")}
                  type="password"
                  id="pin"
                  className={`input ${errors.pin ? "input-error" : ""}`}
                  placeholder="••••"
                  autoComplete="off"
                  disabled={saving}
                  inputMode="numeric"
                  required={!editingChild}
                />
                {errors.pin && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.pin.message}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {editingChild
                    ? "Leave blank to keep the current PIN unchanged"
                    : "This PIN is required for the student to log in"}
                </p>
              </div>

              {error && (
                <div
                  className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : editingChild ? (
                    "Save Changes"
                  ) : (
                    "Add Child"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
