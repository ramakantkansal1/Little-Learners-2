import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Globe,
  Volume2,
  Eye,
  Loader2,
  Save,
} from "lucide-react";

const profile = {
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "+91 98765 43210",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "notifications" | "privacy" | "accessibility"
  >("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  interface Settings {
    notifications: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
      weeklySummary: boolean;
      progressAlerts: boolean;
    };
    privacy: {
      analytics: boolean;
      dataSharing: boolean;
    };
    accessibility: {
      reducedMotion: boolean;
      highContrast: boolean;
      fontSize: "small" | "medium" | "large";
      screenReader: boolean;
    };
    audio: {
      enabled: boolean;
      volume: number;
      speed: number;
    };
    language: string;
  }

  const settings: Settings = {
    notifications: {
      email: true,
      sms: false,
      inApp: true,
      weeklySummary: true,
      progressAlerts: true,
    },
    privacy: {
      analytics: true,
      dataSharing: false,
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontSize: "medium",
      screenReader: false,
    },
    audio: {
      enabled: true,
      volume: 0.8,
      speed: 1.0,
    },
    language: "en",
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setMessage({ type: "success", text: "Settings saved successfully!" });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your account, preferences, and privacy
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <nav
          className="flex border-b border-gray-100"
          aria-label="Settings sections"
        >
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "privacy", label: "Privacy", icon: Shield },
            { id: "accessibility", label: "Accessibility", icon: Eye },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as
                    "profile" | "notifications" | "privacy" | "accessibility",
                )
              }
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center text-3xl">
                  👩
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-gray-900">
                    {profile.name}
                  </h3>
                  <p className="text-gray-500">{profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Full Name</label>
                  <input defaultValue={profile.name} className="input" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    defaultValue={profile.email}
                    className="input"
                    disabled
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    defaultValue={profile.phone}
                    className="input"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Current Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Confirm New Password</label>
                    <input type="password" className="input" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900">
                  Email Notifications
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Receive updates via email
                </p>
              </div>

              {[
                {
                  key: "email",
                  label: "All Notifications",
                  desc: "Receive all notifications via email",
                },
                {
                  key: "weeklySummary",
                  label: "Weekly Summary",
                  desc: "Weekly progress report for your children",
                },
                {
                  key: "progressAlerts",
                  label: "Progress Alerts",
                  desc: "Notifications when milestones are reached",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={
                      settings.notifications[
                        item.key as keyof typeof settings.notifications
                      ]
                    }
                    className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </label>
              ))}

              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  SMS Notifications
                </h3>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">
                      SMS Notifications
                    </p>
                    <p className="text-sm text-gray-500">
                      Receive important alerts via SMS
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={settings.notifications.sms}
                    className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </label>
              </div>

              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Notification Settings"
                )}
              </button>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900">
                  Data & Analytics
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Control how your data is used
                </p>
              </div>

              {[
                {
                  key: "analytics",
                  label: "Analytics & Improvement",
                  desc: "Allow anonymous usage data to improve the platform",
                },
                {
                  key: "dataSharing",
                  label: "Data Sharing for Research",
                  desc: "Share anonymized data for educational research",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={
                      settings.privacy[
                        item.key as keyof typeof settings.privacy
                      ]
                    }
                    className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </label>
              ))}

              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Data Management
                </h3>
                <div className="space-y-3">
                  <button className="btn btn-outline w-full justify-start">
                    Download My Data
                  </button>
                  <button className="btn btn-outline w-full justify-start border-red-200 text-red-600 hover:bg-red-50">
                    Request Account Deletion
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Privacy Settings"
                )}
              </button>
            </div>
          )}

          {/* Accessibility Tab */}
          {activeTab === "accessibility" && (
            <>
              <div className="space-y-6 max-w-2xl">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-900">
                    Audio Settings
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Control narration and sound
                  </p>
                </div>

                <div className="space-y-6">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pastel-blue flex items-center justify-center">
                        <Volume2 className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Audio Narration
                        </p>
                        <p className="text-sm text-gray-500">
                          Play audio for lessons and activities
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={settings.audio.enabled}
                      className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                  </label>

                  <div>
                    <label className="label">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      defaultValue={settings.audio.volume}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-primary-500"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>Mute</span>
                      <span>{Math.round(settings.audio.volume * 100)}%</span>
                      <span>Max</span>
                    </div>
                  </div>

                  <div>
                    <label className="label">Narration Speed</label>
                    <select
                      defaultValue={settings.audio.speed}
                      className="input w-auto"
                    >
                      <option value="0.75">0.75x - Slow</option>
                      <option value="1">1x - Normal</option>
                      <option value="1.25">1.25x - Fast</option>
                      <option value="1.5">1.5x - Very Fast</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-500" />
                    Language
                  </h3>
                  <select
                    defaultValue={settings.language}
                    className="input w-auto"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary-500" />
                    Visual Accessibility
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        key: "reducedMotion" as const,
                        label: "Reduced Motion",
                        desc: "Minimize animations and transitions",
                      },
                      {
                        key: "highContrast" as const,
                        label: "High Contrast",
                        desc: "Increase color contrast for better visibility",
                      },
                      {
                        key: "screenReader" as const,
                        label: "Screen Reader Optimized",
                        desc: "Enhance compatibility with screen readers",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.label}
                          </p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={
                            settings.accessibility[
                              item.key as keyof typeof settings.accessibility
                            ] as boolean
                          }
                          className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                      </label>
                    ))}

                    <div>
                      <label className="label">Font Size</label>
                      <select
                        defaultValue={settings.accessibility.fontSize}
                        className="input w-auto"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Accessibility Settings"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
