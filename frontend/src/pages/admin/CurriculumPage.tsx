import {
  Plus,
  BookOpen,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Archive,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  adminApi,
  curriculumApi,
  type AdminStage,
  type AdminLesson,
  type AdminActivity,
  type Subject,
  type ValidationErrorDetail,
} from "@services/api";
import type { ActivityType } from "@/types";
import {
  activityTypeRegistry,
  validateActivityConfig,
  getRegistryEntry,
  ensureActivityTypesRegistered,
} from "@components/learning/ActivityTypeRegistry";
import "@components/learning/ActivityRenderer";

type ContentType = "stages" | "subjects" | "lessons" | "activities";

// Enriched subject with stage and domain names
interface EnrichedSubject extends Subject {
  stage_name: string;
  domain_name: string;
  topics: number;
  lessons: number;
}

interface StageFormData {
  code: string;
  name: string;
  description: string;
  min_age_months: number;
  max_age_months: number;
  display_order: number;
  icon: string;
  color: string;
  is_active: boolean;
}

interface SubjectFormData {
  stage_id: number;
  domain_id: number;
  code: string;
  name: string;
  description: string;
  display_order: number;
  icon: string;
  color: string;
  is_active: boolean;
  subject_id?: number; // For lesson form subject selection
}

interface LessonFormData {
  topic_id: number;
  code: string;
  status: "draft" | "review" | "published" | "archived";
  version: number;
  estimated_duration_minutes: number;
  thumbnail_url: string;
  instructions: string;
  display_order: number;
  is_active: boolean;
  translations: Array<{
    language: string;
    title: string;
    description: string;
    instructions: string;
    audio_url: string;
  }>;
}

interface ActivityFormData {
  lesson_id: number;
  type: ActivityType;
  code: string;
  status: "draft" | "review" | "published" | "archived";
  version: number;
  display_order: number;
  estimated_duration_minutes: number;
  instructions: string;
  configuration: Record<string, unknown>;
  is_active: boolean;
  translations: Array<{
    language: string;
    title: string;
    description: string;
    instructions: string;
    audio_url: string;
  }>;
}

interface EditingEntity {
  type: ContentType;
  id: number;
  data: StageFormData | SubjectFormData | LessonFormData | ActivityFormData;
}

export default function CurriculumPage() {
  // Data state
  const [stages, setStages] = useState<AdminStage[]>([]);
  const [subjects, setSubjects] = useState<EnrichedSubject[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [topics, setTopics] = useState<
    Array<{ id: number; code: string; name: string; subject_id: number }>
  >([]);

  // UI state
  const [activeTab, setActiveTab] = useState<ContentType>("lessons");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<Record<ContentType, boolean>>({
    stages: true,
    subjects: true,
    lessons: true,
    activities: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EditingEntity | null>(
    null,
  );
  const [previewActivity, setPreviewActivity] = useState<{
    activity: AdminActivity;
    lesson: AdminLesson;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Separate form states for each entity type to avoid union type issues
  const [stageFormData, setStageFormData] = useState<StageFormData>({
    code: "",
    name: "",
    description: "",
    min_age_months: 24,
    max_age_months: 36,
    display_order: 0,
    icon: "",
    color: "#FFB3BA",
    is_active: true,
  });

  const [subjectFormData, setSubjectFormData] = useState<SubjectFormData>({
    stage_id: 0,
    domain_id: 0,
    code: "",
    name: "",
    description: "",
    display_order: 0,
    icon: "",
    color: "#FFB3BA",
    is_active: true,
    subject_id: 0,
  });

  const [lessonFormData, setLessonFormData] = useState<LessonFormData>({
    topic_id: 0,
    code: "",
    status: "draft",
    version: 1,
    estimated_duration_minutes: 10,
    thumbnail_url: "",
    instructions: "",
    display_order: 0,
    is_active: true,
    translations: [
      {
        language: "en",
        title: "",
        description: "",
        instructions: "",
        audio_url: "",
      },
      {
        language: "hi",
        title: "",
        description: "",
        instructions: "",
        audio_url: "",
      },
    ],
  });

  const [activityFormData, setActivityFormData] = useState<ActivityFormData>({
    lesson_id: 0,
    type: "image_selection",
    code: "",
    status: "draft",
    version: 1,
    display_order: 0,
    estimated_duration_minutes: 5,
    instructions: "",
    configuration: {},
    is_active: true,
    translations: [
      {
        language: "en",
        title: "",
        description: "",
        instructions: "",
        audio_url: "",
      },
      {
        language: "hi",
        title: "",
        description: "",
        instructions: "",
        audio_url: "",
      },
    ],
  });

  // Unified form data proxy for backward compatibility with existing code
  const formData = useMemo(
    () => ({
      ...stageFormData,
      ...subjectFormData,
      ...lessonFormData,
      ...activityFormData,
    }),
    [stageFormData, subjectFormData, lessonFormData, activityFormData],
  );

  // Fetch topics for a subject
  const fetchTopicsForSubject = useCallback(async (subjectId: number) => {
    try {
      const topicsData = await curriculumApi.getTopics({
        subject_id: subjectId,
        active_only: true,
      });
      setTopics(
        topicsData.data.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          subject_id: t.subject_id,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch topics:", err);
      setTopics([]);
    }
  }, []);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      // Fetch stages
      setLoading((prev) => ({ ...prev, stages: true }));
      const stagesData = await adminApi.getStages();
      setStages(stagesData.data);
      setLoading((prev) => ({ ...prev, stages: false }));
    } catch (err) {
      console.error("Failed to fetch stages:", err);
      setLoading((prev) => ({ ...prev, stages: false }));
    }

    try {
      // Fetch subjects
      setLoading((prev) => ({ ...prev, subjects: true }));
      const subjectsData = await curriculumApi.getSubjects({
        active_only: true,
      });
      // Enrich with stage info
      const enrichedSubjects = await Promise.all(
        subjectsData.data.map(async (subject) => {
          const stage = stages.find((s) => s.id === subject.stage_id);
          const domain = stage?.domains?.find(
            (d) => d.id === subject.domain_id,
          );
          // Count topics and lessons for this subject
          const topicsData = await curriculumApi.getTopics({
            subject_id: subject.id,
            active_only: true,
          });
          const lessonsData = await adminApi.getLessons({
            subject_id: subject.id,
            limit: 100,
          });
          return {
            ...subject,
            stage_name: stage?.name || "Unknown",
            domain_name: domain?.name || "Unknown",
            topics: topicsData.data.length,
            lessons: lessonsData.data.length,
          };
        }),
      );
      setSubjects(enrichedSubjects);
      setLoading((prev) => ({ ...prev, subjects: false }));
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
      setLoading((prev) => ({ ...prev, subjects: false }));
    }

    try {
      // Fetch lessons
      setLoading((prev) => ({ ...prev, lessons: true }));
      const lessonsData = await adminApi.getLessons({ limit: 100 });
      setLessons(lessonsData.data);
      setLoading((prev) => ({ ...prev, lessons: false }));
    } catch (err) {
      console.error("Failed to fetch lessons:", err);
      setLoading((prev) => ({ ...prev, lessons: false }));
    }

    try {
      // Fetch activities
      setLoading((prev) => ({ ...prev, activities: true }));
      const activitiesData = await adminApi.getActivities({ limit: 100 });
      setActivities(activitiesData.data);
      setLoading((prev) => ({ ...prev, activities: false }));
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setLoading((prev) => ({ ...prev, activities: false }));
    }
  }, [stages]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Defensive: ensure the activity-type registry is populated even when this
  // page is deep-linked without ActivityRenderer ever loading first.
  useEffect(() => {
    void ensureActivityTypesRegistered();
  }, []);

  // Toggle row expansion
  const toggleRow = (id: number) => {
    setExpandedRows((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle form input changes - dispatch to the correct form state setter
  const handleInputChange = (field: string, value: unknown) => {
    if (activeTab === "stages" || editingEntity?.type === "stages") {
      setStageFormData((prev: StageFormData) => ({ ...prev, [field]: value }));
    } else if (activeTab === "subjects" || editingEntity?.type === "subjects") {
      setSubjectFormData((prev: SubjectFormData) => ({
        ...prev,
        [field]: value,
      }));
    } else if (activeTab === "lessons" || editingEntity?.type === "lessons") {
      setLessonFormData((prev: LessonFormData) => ({
        ...prev,
        [field]: value,
      }));
    } else {
      setActivityFormData((prev: ActivityFormData) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Validation
  const validateForm = (): string | null => {
    if (editingEntity?.type === "stages" || activeTab === "stages") {
      const data = formData as StageFormData;
      if (!data.code.trim()) return "Stage code is required";
      if (!data.name.trim()) return "Stage name is required";
      if (data.min_age_months >= data.max_age_months)
        return "Min age must be less than max age";
    }
    if (editingEntity?.type === "subjects" || activeTab === "subjects") {
      const data = formData as SubjectFormData;
      if (!data.code.trim()) return "Subject code is required";
      if (!data.name.trim()) return "Subject name is required";
      if (!data.stage_id) return "Stage is required";
      if (!data.domain_id) return "Domain is required";
    }
    if (editingEntity?.type === "lessons" || activeTab === "lessons") {
      const data = formData as LessonFormData;
      if (!data.topic_id) return "Topic is required";
      if (!data.code.trim()) return "Lesson code is required";
    }
    if (editingEntity?.type === "activities" || activeTab === "activities") {
      const data = formData as ActivityFormData;
      if (!data.lesson_id) return "Lesson is required";
      if (!data.code.trim()) return "Activity code is required";
      if (!data.type) return "Activity type is required";
      const validation = validateActivityConfig(data.type, data.configuration);
      if (!validation.valid) return validation.errors.join(", ");
    }
    return null;
  };

  // Create entity
  const handleCreate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (activeTab === "stages") {
        await adminApi.createStage({
          code: stageFormData.code,
          name: stageFormData.name,
          description: stageFormData.description,
          min_age_months: stageFormData.min_age_months,
          max_age_months: stageFormData.max_age_months,
          display_order: stageFormData.display_order,
          icon: stageFormData.icon,
          color: stageFormData.color,
          is_active: stageFormData.is_active,
        });
      } else if (activeTab === "subjects") {
        await adminApi.createSubject({
          stage_id: subjectFormData.stage_id,
          domain_id: subjectFormData.domain_id,
          code: subjectFormData.code,
          name: subjectFormData.name,
          description: subjectFormData.description,
          display_order: subjectFormData.display_order,
          icon: subjectFormData.icon,
          color: subjectFormData.color,
          is_active: subjectFormData.is_active,
        });
      } else if (activeTab === "lessons") {
        await adminApi.createLesson({
          topic_id: lessonFormData.topic_id,
          code: lessonFormData.code,
          status: lessonFormData.status,
          version: lessonFormData.version,
          estimated_duration_minutes: lessonFormData.estimated_duration_minutes,
          thumbnail_url: lessonFormData.thumbnail_url,
          instructions: lessonFormData.instructions,
          display_order: lessonFormData.display_order,
          is_active: lessonFormData.is_active,
          translations: lessonFormData.translations,
        });
      } else if (activeTab === "activities") {
        await adminApi.createActivity({
          lesson_id: activityFormData.lesson_id,
          type: activityFormData.type,
          code: activityFormData.code,
          status: activityFormData.status,
          version: activityFormData.version,
          display_order: activityFormData.display_order,
          estimated_duration_minutes:
            activityFormData.estimated_duration_minutes,
          instructions: activityFormData.instructions,
          configuration: activityFormData.configuration,
          is_active: activityFormData.is_active,
          translations: activityFormData.translations,
        });
      }
      await fetchAll();
      setShowAddModal(false);
      resetForm();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(error.response?.data?.error?.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  // Update entity
  const handleUpdate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!editingEntity) return;

    setSubmitting(true);
    setError(null);
    try {
      if (editingEntity.type === "stages") {
        await adminApi.updateStage(editingEntity.id, {
          name: stageFormData.name,
          description: stageFormData.description,
          min_age_months: stageFormData.min_age_months,
          max_age_months: stageFormData.max_age_months,
          display_order: stageFormData.display_order,
          icon: stageFormData.icon,
          color: stageFormData.color,
          is_active: stageFormData.is_active,
        });
      } else if (editingEntity.type === "subjects") {
        await adminApi.updateSubject(editingEntity.id, {
          stage_id: subjectFormData.stage_id,
          domain_id: subjectFormData.domain_id,
          name: subjectFormData.name,
          description: subjectFormData.description,
          display_order: subjectFormData.display_order,
          icon: subjectFormData.icon,
          color: subjectFormData.color,
          is_active: subjectFormData.is_active,
        });
      } else if (editingEntity.type === "lessons") {
        await adminApi.updateLesson(editingEntity.id, {
          topic_id: lessonFormData.topic_id,
          status: lessonFormData.status,
          version: lessonFormData.version,
          estimated_duration_minutes: lessonFormData.estimated_duration_minutes,
          thumbnail_url: lessonFormData.thumbnail_url,
          instructions: lessonFormData.instructions,
          display_order: lessonFormData.display_order,
          is_active: lessonFormData.is_active,
          translations: lessonFormData.translations,
        });
      } else if (editingEntity.type === "activities") {
        await adminApi.updateActivity(editingEntity.id, {
          lesson_id: activityFormData.lesson_id,
          type: activityFormData.type,
          status: activityFormData.status,
          version: activityFormData.version,
          display_order: activityFormData.display_order,
          estimated_duration_minutes:
            activityFormData.estimated_duration_minutes,
          instructions: activityFormData.instructions,
          configuration: activityFormData.configuration,
          is_active: activityFormData.is_active,
          translations: activityFormData.translations,
        });
      }
      await fetchAll();
      setEditingEntity(null);
      resetForm();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(error.response?.data?.error?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete entity
  const handleDelete = async (type: ContentType, id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this? This action cannot be undone.",
      )
    )
      return;

    setError(null);
    try {
      if (type === "stages") {
        await adminApi.deleteStage(id);
      } else if (type === "subjects") {
        await adminApi.deleteSubject(id);
      } else if (type === "lessons") {
        // Use archive instead of delete for lessons (preserves history)
        await adminApi.archiveLesson(id);
      } else if (type === "activities") {
        await adminApi.deleteActivity(id);
      }
      await fetchAll();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(error.response?.data?.error?.message || "Failed to delete");
    }
  };

  // Publish lesson with validation
  const handlePublishLesson = async (lessonId: number) => {
    setError(null);
    try {
      const response = await adminApi.publishLesson(lessonId);
      const result = response.data;
      if (result.valid) {
        await fetchAll();
      } else {
        // Show validation errors
        const errorMessages = result.errors
          .map((e: ValidationErrorDetail) => `${e.field}: ${e.message}`)
          .join("; ");
        setError(`Validation failed: ${errorMessages}`);
      }
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            error?: { message?: string; details?: ValidationErrorDetail[] };
          };
        };
      };
      if (error.response?.data?.error?.details) {
        const details = error.response.data.error.details;
        const errorMessages = details
          .map((d: ValidationErrorDetail) => `${d.field}: ${d.message}`)
          .join("; ");
        setError(`Validation failed: ${errorMessages}`);
      } else {
        setError(error.response?.data?.error?.message || "Failed to publish");
      }
    }
  };

  // Unpublish lesson
  const handleUnpublishLesson = async (lessonId: number) => {
    if (
      !window.confirm("Unpublish this lesson? Students will no longer see it.")
    )
      return;

    setError(null);
    try {
      await adminApi.unpublishLesson(lessonId);
      await fetchAll();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(error.response?.data?.error?.message || "Failed to unpublish");
    }
  };

  // Archive lesson
  const handleArchiveLesson = async (lessonId: number) => {
    if (
      !window.confirm(
        "Archive this lesson? This will hide it from all views but preserve history.",
      )
    )
      return;

    setError(null);
    try {
      await adminApi.archiveLesson(lessonId);
      await fetchAll();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(error.response?.data?.error?.message || "Failed to archive");
    }
  };

  // Start editing
  const startEdit = (
    type: ContentType,
    entity: AdminStage | AdminLesson | AdminActivity | EnrichedSubject,
  ) => {
    // Populate form data based on entity type
    if (type === "stages") {
      const stage = entity as AdminStage;
      setStageFormData({
        code: stage.code,
        name: stage.name,
        description: stage.description || "",
        min_age_months: stage.min_age_months,
        max_age_months: stage.max_age_months,
        display_order: stage.display_order,
        icon: stage.icon || "",
        color: stage.color || "#FFB3BA",
        is_active: stage.is_active,
      });
    } else if (type === "subjects") {
      const subject = entity as EnrichedSubject;
      setSubjectFormData({
        stage_id: subject.stage_id,
        domain_id: subject.domain_id,
        code: subject.code,
        name: subject.name,
        description: subject.description || "",
        display_order: subject.display_order,
        icon: subject.icon || "",
        color: subject.color || "#FFB3BA",
        is_active: subject.is_active,
      });
    } else if (type === "lessons") {
      const lesson = entity as AdminLesson;
      // Find subject to get subject_id
      const subject = subjects.find((s) => s.name === lesson.subject_name);
      const subjectId = subject?.id || 0;
      if (subjectId) {
        fetchTopicsForSubject(subjectId);
      }
      setSubjectFormData((prev) => ({ ...prev, subject_id: subjectId }));
      setLessonFormData({
        topic_id: 0, // Would need to fetch from API
        code: lesson.code,
        status: lesson.status as "draft" | "review" | "published" | "archived",
        version: 1,
        estimated_duration_minutes: lesson.estimated_duration_minutes || 10,
        thumbnail_url: "",
        instructions: "",
        display_order: lesson.display_order,
        is_active: true,
        translations: [
          {
            language: "en",
            title: lesson.title,
            description: "",
            instructions: "",
            audio_url: "",
          },
          {
            language: "hi",
            title: "",
            description: "",
            instructions: "",
            audio_url: "",
          },
        ],
      });
    } else if (type === "activities") {
      const activity = entity as AdminActivity;
      setActivityFormData({
        lesson_id: activity.lesson_id,
        type: activity.type as ActivityType,
        code: activity.code,
        status: activity.status as
          "draft" | "review" | "published" | "archived",
        version: 1,
        display_order: activity.display_order,
        estimated_duration_minutes: 5,
        instructions: "",
        configuration: {},
        is_active: true,
        translations: [
          {
            language: "en",
            title: activity.title || "",
            description: "",
            instructions: "",
            audio_url: "",
          },
          {
            language: "hi",
            title: "",
            description: "",
            instructions: "",
            audio_url: "",
          },
        ],
      });
    }
    setEditingEntity({
      type,
      id: entity.id,
      data: entity as
        StageFormData | SubjectFormData | LessonFormData | ActivityFormData,
    });
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingEntity(null);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setStageFormData({
      code: "",
      name: "",
      description: "",
      min_age_months: 24,
      max_age_months: 36,
      display_order: 0,
      icon: "",
      color: "#FFB3BA",
      is_active: true,
    });
    setSubjectFormData({
      stage_id: 0,
      domain_id: 0,
      code: "",
      name: "",
      description: "",
      display_order: 0,
      icon: "",
      color: "#FFB3BA",
      is_active: true,
    });
    setLessonFormData({
      topic_id: 0,
      code: "",
      status: "draft",
      version: 1,
      estimated_duration_minutes: 10,
      thumbnail_url: "",
      instructions: "",
      display_order: 0,
      is_active: true,
      translations: [
        {
          language: "en",
          title: "",
          description: "",
          instructions: "",
          audio_url: "",
        },
        {
          language: "hi",
          title: "",
          description: "",
          instructions: "",
          audio_url: "",
        },
      ],
    });
    setActivityFormData({
      lesson_id: 0,
      type: "image_selection",
      code: "",
      status: "draft",
      version: 1,
      display_order: 0,
      estimated_duration_minutes: 5,
      instructions: "",
      configuration: {},
      is_active: true,
      translations: [
        {
          language: "en",
          title: "",
          description: "",
          instructions: "",
          audio_url: "",
        },
        {
          language: "hi",
          title: "",
          description: "",
          instructions: "",
          audio_url: "",
        },
      ],
    });
  };

  // Preview activity
  const openPreview = async (activity: AdminActivity) => {
    const lesson = lessons.find((l) => l.id === activity.lesson_id);
    if (lesson) {
      setPreviewActivity({ activity, lesson });
    }
  };

  // Close preview
  const closePreview = () => {
    setPreviewActivity(null);
  };

  // Render activity type selector
  const renderActivityTypeSelector = () => {
    const entries = activityTypeRegistry.getAllEntries();
    const currentData =
      activeTab === "activities"
        ? activityFormData
        : editingEntity?.type === "activities"
          ? activityFormData
          : { type: "image_selection" };
    return (
      <div>
        <label className="label">Activity Type</label>
        <select
          className="input"
          value={currentData.type || ""}
          onChange={(e) =>
            setActivityFormData((prev) => ({
              ...prev,
              type: e.target.value as ActivityType,
            }))
          }
        >
          <option value="">Select activity type</option>
          {entries.map((entry) => (
            <option key={entry.type} value={entry.type}>
              {entry.icon} {entry.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Filtered data
  const filteredStages = useMemo(
    () =>
      stages.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [stages, search],
  );

  const filteredSubjects = useMemo(
    () =>
      subjects.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [subjects, search],
  );

  const filteredLessons = useMemo(
    () =>
      lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [lessons, search],
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.code.toLowerCase().includes(search.toLowerCase()),
      ),
    [activities, search],
  );

  // Check if any data is loading
  const isLoading = Object.values(loading).some((v) => v);

  if (
    isLoading &&
    stages.length === 0 &&
    subjects.length === 0 &&
    lessons.length === 0 &&
    activities.length === 0
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading curriculum data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="btn btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
              Curriculum Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage stages, subjects, lessons, and activities
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingEntity(null);
            setShowAddModal(true);
            resetForm();
          }}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add Content
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
          role="alert"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <nav
          className="flex border-b border-gray-100"
          aria-label="Curriculum sections"
        >
          {[
            {
              id: "stages",
              label: "Stages",
              icon: BookOpen,
              count: stages.length,
            },
            {
              id: "subjects",
              label: "Subjects",
              icon: BookOpen,
              count: subjects.length,
            },
            {
              id: "lessons",
              label: "Lessons",
              icon: BookOpen,
              count: lessons.length,
            },
            {
              id: "activities",
              label: "Activities",
              icon: BookOpen,
              count: activities.length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ContentType);
                setSearch("");
              }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          {/* Search */}
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-64"
            />
            {loading[activeTab] && (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            )}
          </div>

          {/* Stages Tab */}
          {activeTab === "stages" && (
            <div>
              {filteredStages.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No stages found
                  </h3>
                  <p className="text-gray-500">
                    Create your first learning stage to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredStages.map((stage) => (
                    <div key={stage.id} className="card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {stage.name}
                        </h3>
                        <span
                          className={`badge ${stage.is_active ? "badge-success" : "badge-secondary"}`}
                        >
                          {stage.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p>Code: {stage.code}</p>
                        <p>
                          Ages: {stage.min_age_months}-{stage.max_age_months}{" "}
                          months
                        </p>
                        <p>Order: {stage.display_order}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit("stages", stage)}
                          className="btn btn-primary btn-sm flex-1 justify-center"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete("stages", stage.id)}
                          className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 flex-1 justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === "subjects" && (
            <div>
              {filteredSubjects.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No subjects found
                  </h3>
                  <p className="text-gray-500">
                    Create subjects to organize your curriculum
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Stage
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Topics
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Lessons
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((subject) => (
                        <tr
                          key={subject.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {subject.name}
                          </td>
                          <td className="p-4 text-gray-600 capitalize">
                            {subject.stage_name}
                          </td>
                          <td className="p-4 text-gray-600">
                            {subject.domain_name}
                          </td>
                          <td className="p-4 text-gray-600">
                            {subject.topics}
                          </td>
                          <td className="p-4 text-gray-600">
                            {subject.lessons}
                          </td>
                          <td className="p-4">
                            <span
                              className={`badge ${subject.is_active ? "badge-success" : "badge-secondary"}`}
                            >
                              {subject.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit("subjects", subject)}
                                className="btn btn-ghost btn-sm"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete("subjects", subject.id)
                                }
                                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Lessons Tab */}
          {activeTab === "lessons" && (
            <div>
              {filteredLessons.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No lessons found
                  </h3>
                  <p className="text-gray-500">
                    Create lessons to build your curriculum
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Lesson
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Stage
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Activities
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Updated
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLessons.map((lesson) => (
                        <tr
                          key={lesson.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {lesson.title}
                          </td>
                          <td className="p-4 text-gray-600">
                            {lesson.subject_name}
                          </td>
                          <td className="p-4 text-gray-600 capitalize">
                            {lesson.stage_code}
                          </td>
                          <td className="p-4">
                            <span
                              className={`badge ${
                                lesson.status === "published"
                                  ? "badge-success"
                                  : lesson.status === "draft"
                                    ? "badge-secondary"
                                    : "badge-warning"
                              }`}
                            >
                              {lesson.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            <button
                              onClick={() => toggleRow(lesson.id)}
                              className="text-primary-500 hover:underline"
                            >
                              {lesson.activity_count || 0}{" "}
                              {expandedRows.has(lesson.id) ? "▲" : "▼"}
                            </button>
                          </td>
                          <td className="p-4 text-gray-600">
                            {lesson.published_at
                              ? new Date(
                                  lesson.published_at,
                                ).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleRow(lesson.id)}
                                className="btn btn-ghost btn-sm"
                                title="View activities"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEdit("lessons", lesson)}
                                className="btn btn-ghost btn-sm"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {lesson.status === "draft" && (
                                <button
                                  onClick={() => handlePublishLesson(lesson.id)}
                                  className="btn btn-primary btn-sm"
                                  title="Validate and publish"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {lesson.status === "published" && (
                                <button
                                  onClick={() =>
                                    handleUnpublishLesson(lesson.id)
                                  }
                                  className="btn btn-secondary btn-sm"
                                  title="Unpublish"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              {lesson.status !== "archived" && (
                                <button
                                  onClick={() => handleArchiveLesson(lesson.id)}
                                  className="btn btn-ghost btn-sm text-orange-600 hover:bg-orange-50"
                                  title="Archive"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleDelete("lessons", lesson.id)
                                }
                                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Expanded row for activities */}
              {filteredLessons.some((l) => expandedRows.has(l.id)) && (
                <div className="mt-4">
                  {filteredLessons
                    .filter((l) => expandedRows.has(l.id))
                    .map((lesson) => (
                      <div key={lesson.id} className="card p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Activities in "{lesson.title}"
                        </h4>
                        {activities.filter((a) => a.lesson_id === lesson.id)
                          .length === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No activities yet
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {activities
                              .filter((a) => a.lesson_id === lesson.id)
                              .map((activity) => (
                                <div
                                  key={activity.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`badge ${activity.status === "published" ? "badge-success" : "badge-secondary"}`}
                                    >
                                      {activity.status}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {activity.title}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {activity.type}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      Order: {activity.display_order}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openPreview(activity)}
                                      className="btn btn-ghost btn-sm"
                                    >
                                      <Eye className="w-4 h-4" /> Preview
                                    </button>
                                    <button
                                      onClick={() =>
                                        startEdit("activities", activity)
                                      }
                                      className="btn btn-ghost btn-sm"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === "activities" && (
            <div>
              {filteredActivities.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No activities found
                  </h3>
                  <p className="text-gray-500">
                    Create activities to build your lessons
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Lesson
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((activity) => (
                        <tr
                          key={activity.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {activity.title}
                          </td>
                          <td className="p-4">
                            <span className="badge badge-primary">
                              {
                                getRegistryEntry(activity.type as ActivityType)
                                  ?.icon
                              }{" "}
                              {getRegistryEntry(activity.type as ActivityType)
                                ?.label || activity.type}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {activity.lesson_title}
                          </td>
                          <td className="p-4">
                            <span
                              className={`badge ${activity.status === "published" ? "badge-success" : activity.status === "draft" ? "badge-secondary" : "badge-warning"}`}
                            >
                              {activity.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {activity.display_order}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openPreview(activity)}
                                className="btn btn-ghost btn-sm"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  startEdit("activities", activity)
                                }
                                className="btn btn-ghost btn-sm"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete("activities", activity.id)
                                }
                                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">
                Add New Content
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <div>
                <label className="label">Content Type</label>
                <select
                  className="input"
                  value={activeTab}
                  onChange={() => {}}
                  disabled
                >
                  <option value="stages">Learning Stage</option>
                  <option value="subjects">Subject</option>
                  <option value="lessons">Lesson</option>
                  <option value="activities">Activity</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Switch tabs to change content type
                </p>
              </div>

              {activeTab === "stages" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.code}
                      onChange={(e) =>
                        handleInputChange("code", e.target.value)
                      }
                      placeholder="e.g., playgroup"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="e.g., Playgroup / Pre-Nursery"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Min Age (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.min_age_months}
                      onChange={(e) =>
                        handleInputChange(
                          "min_age_months",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                      max={144}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Max Age (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.max_age_months}
                      onChange={(e) =>
                        handleInputChange(
                          "max_age_months",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                      max={144}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Display Order</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Icon</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.icon}
                      onChange={(e) =>
                        handleInputChange("icon", e.target.value)
                      }
                      placeholder="e.g., baby, blocks, abc"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Color</label>
                    <input
                      type="color"
                      className="input h-10 w-10 p-1"
                      value={formData.color}
                      onChange={(e) =>
                        handleInputChange("color", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Stage description..."
                    />
                  </div>
                </div>
              )}

              {activeTab === "subjects" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Stage <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.stage_id}
                      onChange={(e) =>
                        handleInputChange("stage_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select stage</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      Domain <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.domain_id}
                      onChange={(e) =>
                        handleInputChange("domain_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select domain</option>
                      {stages.flatMap(
                        (s) =>
                          s.domains?.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          )) || [],
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.code}
                      onChange={(e) =>
                        handleInputChange("code", e.target.value)
                      }
                      placeholder="e.g., english"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="e.g., English Language"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Display Order</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Icon</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.icon}
                      onChange={(e) =>
                        handleInputChange("icon", e.target.value)
                      }
                      placeholder="e.g., book, abc"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Color</label>
                    <input
                      type="color"
                      className="input h-10 w-10 p-1"
                      value={formData.color}
                      onChange={(e) =>
                        handleInputChange("color", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Subject description..."
                    />
                  </div>
                </div>
              )}

              {activeTab === "lessons" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={subjectFormData.subject_id || 0}
                      onChange={(e) => {
                        const subjectId = parseInt(e.target.value);
                        setSubjectFormData((prev) => ({
                          ...prev,
                          subject_id: subjectId,
                        }));
                        if (subjectId) fetchTopicsForSubject(subjectId);
                      }}
                      required
                    >
                      <option value="">Select subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      Topic <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.topic_id}
                      onChange={(e) =>
                        handleInputChange("topic_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select topic</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                    {topics.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Select a subject to load topics
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.code}
                      onChange={(e) =>
                        handleInputChange("code", e.target.value)
                      }
                      placeholder="e.g., lesson_1"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={formData.status}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Display Order</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="label">Estimated Duration (min)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.estimated_duration_minutes}
                      onChange={(e) =>
                        handleInputChange(
                          "estimated_duration_minutes",
                          parseInt(e.target.value),
                        )
                      }
                      min={1}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Thumbnail URL</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.thumbnail_url}
                      onChange={(e) =>
                        handleInputChange("thumbnail_url", e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Instructions</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.instructions}
                      onChange={(e) =>
                        handleInputChange("instructions", e.target.value)
                      }
                      placeholder="Lesson instructions..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">English Title</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.translations[0]?.title || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            { ...prev.translations[0], title: e.target.value },
                            prev.translations[1],
                          ],
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Hindi Title</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.translations[1]?.title || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            prev.translations[0],
                            { ...prev.translations[1], title: e.target.value },
                          ],
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">English Description</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={formData.translations[0]?.description || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            {
                              ...prev.translations[0],
                              description: e.target.value,
                            },
                            prev.translations[1],
                          ],
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Hindi Description</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={formData.translations[1]?.description || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            prev.translations[0],
                            {
                              ...prev.translations[1],
                              description: e.target.value,
                            },
                          ],
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === "activities" && (
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      Lesson ID <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.lesson_id}
                      onChange={(e) =>
                        handleInputChange("lesson_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select lesson</option>
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} ({l.subject_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  {renderActivityTypeSelector()}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={formData.code}
                        onChange={(e) =>
                          handleInputChange("code", e.target.value)
                        }
                        placeholder="e.g., activity_1"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Display Order</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.display_order}
                        onChange={(e) =>
                          handleInputChange(
                            "display_order",
                            parseInt(e.target.value),
                          )
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="label">Estimated Duration (min)</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.estimated_duration_minutes}
                        onChange={(e) =>
                          handleInputChange(
                            "estimated_duration_minutes",
                            parseInt(e.target.value),
                          )
                        }
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={formData.status}
                        onChange={(e) =>
                          handleInputChange("status", e.target.value)
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Difficulty Tier</label>
                      <select
                        className="input"
                        value={
                          formData.configuration?.difficulty_tier
                            ? String(formData.configuration.difficulty_tier)
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange("configuration", {
                            ...formData.configuration,
                            difficulty_tier: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">
                          Auto (based on curriculum order)
                        </option>
                        <option value="1">Easy (Tier 1)</option>
                        <option value="2">Medium (Tier 2)</option>
                        <option value="3">Hard (Tier 3)</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Used by adaptive recommendation. Auto uses curriculum
                        sequence.
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Configuration (JSON)</label>
                      <textarea
                        className="input font-mono text-sm h-32"
                        value={JSON.stringify(formData.configuration, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            handleInputChange("configuration", parsed);
                          } catch {
                            /* Ignore invalid JSON input */
                          }
                        }}
                        placeholder="{}"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Edit form for stages */}
              {editingEntity?.type === "stages" && !showAddModal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.code}
                      onChange={(e) =>
                        handleInputChange("code", e.target.value)
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <label className="label">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Min Age (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.min_age_months}
                      onChange={(e) =>
                        handleInputChange(
                          "min_age_months",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                      max={144}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Max Age (months) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.max_age_months}
                      onChange={(e) =>
                        handleInputChange(
                          "max_age_months",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                      max={144}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Display Order</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Icon</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.icon}
                      onChange={(e) =>
                        handleInputChange("icon", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Color</label>
                    <input
                      type="color"
                      className="input h-10 w-10 p-1"
                      value={formData.color}
                      onChange={(e) =>
                        handleInputChange("color", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Edit form for subjects */}
              {editingEntity?.type === "subjects" && !showAddModal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.code}
                      onChange={(e) =>
                        handleInputChange("code", e.target.value)
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <label className="label">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Stage <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.stage_id}
                      onChange={(e) =>
                        handleInputChange("stage_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select stage</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      Domain <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.domain_id}
                      onChange={(e) =>
                        handleInputChange("domain_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select domain</option>
                      {stages.flatMap(
                        (s) =>
                          s.domains?.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          )) || [],
                      )}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Display Order</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Icon</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.icon}
                      onChange={(e) =>
                        handleInputChange("icon", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Color</label>
                    <input
                      type="color"
                      className="input h-10 w-10 p-1"
                      value={formData.color}
                      onChange={(e) =>
                        handleInputChange("color", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Edit form for lessons */}
              {editingEntity?.type === "lessons" && !showAddModal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={subjectFormData.subject_id || 0}
                      onChange={(e) => {
                        const subjectId = parseInt(e.target.value);
                        setSubjectFormData((prev) => ({
                          ...prev,
                          subject_id: subjectId,
                        }));
                        if (subjectId) fetchTopicsForSubject(subjectId);
                      }}
                      required
                    >
                      <option value="">Select subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      Topic <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.topic_id}
                      onChange={(e) =>
                        handleInputChange("topic_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select topic</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                    {topics.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Select a subject to load topics
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={formData.status}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Display Order</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.display_order}
                      onChange={(e) =>
                        handleInputChange(
                          "display_order",
                          parseInt(e.target.value),
                        )
                      }
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="label">Estimated Duration (min)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.estimated_duration_minutes}
                      onChange={(e) =>
                        handleInputChange(
                          "estimated_duration_minutes",
                          parseInt(e.target.value),
                        )
                      }
                      min={1}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Thumbnail URL</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.thumbnail_url}
                      onChange={(e) =>
                        handleInputChange("thumbnail_url", e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Instructions</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={formData.instructions}
                      onChange={(e) =>
                        handleInputChange("instructions", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">English Title</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.translations[0]?.title || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            { ...prev.translations[0], title: e.target.value },
                            prev.translations[1],
                          ],
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Hindi Title</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.translations[1]?.title || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            prev.translations[0],
                            { ...prev.translations[1], title: e.target.value },
                          ],
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">English Description</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={formData.translations[0]?.description || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            {
                              ...prev.translations[0],
                              description: e.target.value,
                            },
                            prev.translations[1],
                          ],
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Hindi Description</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={formData.translations[1]?.description || ""}
                      onChange={(e) =>
                        setLessonFormData((prev) => ({
                          ...prev,
                          translations: [
                            prev.translations[0],
                            {
                              ...prev.translations[1],
                              description: e.target.value,
                            },
                          ],
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Edit form for activities */}
              {editingEntity?.type === "activities" && !showAddModal && (
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      Lesson ID <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.lesson_id}
                      onChange={(e) =>
                        handleInputChange("lesson_id", parseInt(e.target.value))
                      }
                      required
                    >
                      <option value="">Select lesson</option>
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title} ({l.subject_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  {renderActivityTypeSelector()}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={formData.code}
                        onChange={(e) =>
                          handleInputChange("code", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Display Order</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.display_order}
                        onChange={(e) =>
                          handleInputChange(
                            "display_order",
                            parseInt(e.target.value),
                          )
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="label">Estimated Duration (min)</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.estimated_duration_minutes}
                        onChange={(e) =>
                          handleInputChange(
                            "estimated_duration_minutes",
                            parseInt(e.target.value),
                          )
                        }
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={formData.status}
                        onChange={(e) =>
                          handleInputChange("status", e.target.value)
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Difficulty Tier</label>
                      <select
                        className="input"
                        value={
                          formData.configuration?.difficulty_tier
                            ? String(formData.configuration.difficulty_tier)
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange("configuration", {
                            ...formData.configuration,
                            difficulty_tier: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">
                          Auto (based on curriculum order)
                        </option>
                        <option value="1">Easy (Tier 1)</option>
                        <option value="2">Medium (Tier 2)</option>
                        <option value="3">Hard (Tier 3)</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Used by adaptive recommendation. Auto uses curriculum
                        sequence.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="label">Configuration (JSON)</label>
                    <textarea
                      className="input font-mono text-sm h-32"
                      value={JSON.stringify(formData.configuration, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          handleInputChange("configuration", parsed);
                        } catch {
                          /* Ignore invalid JSON input */
                        }
                      }}
                      placeholder="{}"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Type-specific configuration for{" "}
                      {formData.type || "selected type"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">English Title</label>
                      <input
                        type="text"
                        className="input"
                        value={activityFormData.translations[0]?.title || ""}
                        onChange={(e) =>
                          setActivityFormData((prev: ActivityFormData) => ({
                            ...prev,
                            translations: [
                              {
                                ...prev.translations[0],
                                title: e.target.value,
                              },
                              prev.translations[1],
                            ],
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Hindi Title</label>
                      <input
                        type="text"
                        className="input"
                        value={activityFormData.translations[1]?.title || ""}
                        onChange={(e) =>
                          setActivityFormData((prev: ActivityFormData) => ({
                            ...prev,
                            translations: [
                              prev.translations[0],
                              {
                                ...prev.translations[1],
                                title: e.target.value,
                              },
                            ],
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEntity(null);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}{" "}
                  {showAddModal ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-gray-900">
                  {previewActivity.activity.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  <span
                    className={`badge ${previewActivity.activity.status === "published" ? "badge-success" : "badge-secondary"}`}
                  >
                    {previewActivity.activity.status}
                  </span>
                  <span className="mx-2">|</span>
                  <span className="badge badge-primary">
                    {
                      getRegistryEntry(
                        previewActivity.activity.type as ActivityType,
                      )?.icon
                    }{" "}
                    {
                      getRegistryEntry(
                        previewActivity.activity.type as ActivityType,
                      )?.label
                    }
                  </span>
                  <span className="mx-2">|</span>
                  <span className="text-sm text-gray-500">
                    {previewActivity.lesson.title}
                  </span>
                </p>
              </div>
              <button
                onClick={closePreview}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ActivityPreview
                activity={previewActivity.activity}
                onClose={closePreview}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntity && !showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">
                Edit {editingEntity.type.slice(0, -1)}
              </h2>
              <button
                onClick={cancelEdit}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate();
              }}
            >
              {/* Form fields rendered based on editingEntity.type - similar to add modal but with pre-filled data */}
              <div className="text-center text-gray-500 py-4">
                Edit form for {editingEntity.type} - Implementation in progress
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}{" "}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Preview component that renders activity without student attempt logic
function ActivityPreview({
  activity,
  onClose,
}: {
  activity: AdminActivity;
  onClose: () => void;
}) {
  const registryEntry = activityTypeRegistry.get(activity.type as ActivityType);
  const Component = registryEntry?.component;

  if (!Component) {
    return (
      <div className="card p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-4xl">
          {registryEntry?.icon || "📝"}
        </div>
        <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
          Preview Not Available
        </h3>
        <p className="text-gray-600 mb-6">
          Activity type "{activity.type}" is not yet supported for preview.
        </p>
        <button onClick={onClose} className="btn btn-primary">
          Close
        </button>
      </div>
    );
  }

  // Render the activity component in preview mode (read-only)
  // We need to mock the props that the component expects
  // For preview, we fetch the full activity data with questions
  // For now, show a simplified preview

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary">
              {getRegistryEntry(activity.type as ActivityType)?.label ||
                activity.type}
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {activity.title}
          </h1>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">Question 1 of 3</p>
          <p className="text-sm font-semibold text-gray-900">Score: 0</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full"
            style={{ width: "33%" }}
          />
        </div>
      </div>

      <div className="card p-6">
        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-gray-900">
            Sample question prompt goes here
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {["Option 1", "Option 2", "Option 3"].map((opt, i) => (
            <button
              key={i}
              className="relative p-5 rounded-xl border-2 text-left border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{opt}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{opt}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn btn-secondary" disabled>
          <ArrowLeft className="w-5 h-5" />
          Previous
        </button>
        <button className="btn btn-primary" disabled>
          Next
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-700">
          <strong>Preview Mode:</strong> This is a read-only preview. No student
          attempts are created, no answers are recorded, and no rewards are
          awarded.
        </p>
      </div>
    </div>
  );
}
