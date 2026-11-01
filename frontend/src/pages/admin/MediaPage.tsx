import {
  Search,
  Image,
  Film,
  Music,
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import { useState } from "react";

const media = [
  {
    id: 1,
    name: "elephant-counting.svg",
    type: "image",
    size: "45 KB",
    dimensions: "400x400",
    usedIn: "Lesson: Counting 1-10",
    uploaded: "2024-01-15",
    uploadedBy: "Content Team",
  },
  {
    id: 2,
    name: "apple-red.png",
    type: "image",
    size: "120 KB",
    dimensions: "300x300",
    usedIn: "Activity: Count the Apples",
    uploaded: "2024-01-14",
    uploadedBy: "Content Team",
  },
  {
    id: 3,
    name: "alphabet-song.mp3",
    type: "audio",
    size: "2.3 MB",
    duration: "0:45",
    usedIn: "Lesson: Letter Sounds A-E",
    uploaded: "2024-01-13",
    uploadedBy: "Audio Team",
  },
  {
    id: 4,
    name: "shape-circle.svg",
    type: "image",
    size: "12 KB",
    dimensions: "200x200",
    usedIn: "Multiple lessons",
    uploaded: "2024-01-12",
    uploadedBy: "Design Team",
  },
  {
    id: 5,
    name: "counting-video.mp4",
    type: "video",
    size: "15.6 MB",
    duration: "2:30",
    usedIn: "Lesson: Counting 1-20",
    uploaded: "2024-01-11",
    uploadedBy: "Video Team",
  },
  {
    id: 6,
    name: "hindi-letters.pdf",
    type: "document",
    size: "890 KB",
    usedIn: "Lesson: Hindi Swar",
    uploaded: "2024-01-10",
    uploadedBy: "Content Team",
  },
];

export default function MediaPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const filteredMedia = media.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return Image;
      case "audio":
        return Music;
      case "video":
        return Film;
      case "document":
        return FileText;
      default:
        return FileText;
    }
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = getTypeIcon(type);
    return <Icon className="w-16 h-16" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-blue-100 text-blue-700";
      case "audio":
        return "bg-green-100 text-green-700";
      case "video":
        return "bg-purple-100 text-purple-700";
      case "document":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSelectedFiles([]);
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            Media Library
          </h1>
          <p className="text-gray-600 mt-1">
            Manage images, audio, video, and documents
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary"
        >
          <Upload className="w-5 h-5" />
          Upload Media
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="document">Documents</option>
          </select>
        </div>
      </div>

      {/* Media Grid */}
      <div className="card overflow-hidden">
        {filteredMedia.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Image className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
              No media found
            </h3>
            <p className="text-gray-600">
              Upload your first media file to get started
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary mt-4"
            >
              <Upload className="w-5 h-5" />
              Upload Media
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-display font-bold text-gray-900">
                  {filteredMedia.length} files
                </h2>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm">Grid View</button>
                  <button className="btn btn-ghost btn-sm">List View</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
              {filteredMedia.map((item) => (
                <div key={item.id} className="card p-4 group">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon type={item.type} />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-ghost btn-sm bg-white/90">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm bg-white/90">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm bg-white/90 text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getTypeColor(item.type)}`}
                      >
                        {item.type}
                      </span>
                      <>
                        {item.dimensions && (
                          <>
                            {" "}
                            <span className="mx-1">•</span>{" "}
                            <span>{item.dimensions}</span>{" "}
                          </>
                        )}
                        {item.duration && (
                          <>
                            {" "}
                            <span className="mx-1">•</span>{" "}
                            <span>{item.duration}</span>{" "}
                          </>
                        )}
                        {item.size && (
                          <>
                            {" "}
                            <span className="mx-1">•</span>{" "}
                            <span>{item.size}</span>{" "}
                          </>
                        )}
                      </>
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Used in: {item.usedIn}
                    </p>
                    <p className="text-xs text-gray-400">
                      Uploaded {item.uploaded} by {item.uploadedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">
                Upload Media
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-sm text-gray-400">
                  Supports: JPG, PNG, SVG, MP3, WAV, MP4, PDF (max 10MB each)
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="btn btn-primary mt-4 inline-flex"
                >
                  <Upload className="w-5 h-5" />
                  Browse Files
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-gray-900">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-xs">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedFiles((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0}
                  className="btn btn-primary flex-1"
                >
                  {selectedFiles.length === 0
                    ? "Select Files First"
                    : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
