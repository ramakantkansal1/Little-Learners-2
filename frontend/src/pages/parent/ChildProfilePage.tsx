import { Link } from 'react-router-dom';
import { ArrowLeft, Edit, Save, X, User, Globe, Volume2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

const stages = [
  { code: 'playgroup', name: 'Playgroup / Pre-Nursery (2-3 years)' },
  { code: 'nursery', name: 'Nursery (3-4 years)' },
  { code: 'lkg', name: 'LKG (4-5 years)' },
  { code: 'ukg', name: 'UKG (5-6 years)' },
];

const avatars = ['👦', '👧', '🐘', '🦉', '🐰', '🐯', '🐻', '🐨', '🦁', '🐵'];

const child = {
  id: 1,
  name: 'Aarav',
  age: 4,
  stage: 'nursery',
  avatar: '👦',
  dob: '2020-05-15',
  language: 'en',
  audioEnabled: true,
  reducedMotion: false,
  highContrast: false,
  isActive: true,
};

export default function ChildProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: child.name,
    age: child.age,
    stage: child.stage,
    avatar: child.avatar,
    dob: child.dob,
    language: child.language,
    audioEnabled: child.audioEnabled,
    reducedMotion: child.reducedMotion,
    highContrast: child.highContrast,
    isActive: child.isActive,
  });

  const handleSave = () => {
    setIsEditing(false);
    // TODO: API call to save
  };

  const handleCancel = () => {
    setFormData({
      name: child.name,
      age: child.age,
      stage: child.stage,
      avatar: child.avatar,
      dob: child.dob,
      language: child.language,
      audioEnabled: child.audioEnabled,
      reducedMotion: child.reducedMotion,
      highContrast: child.highContrast,
      isActive: child.isActive,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/parent/children" className="btn btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{child.name}'s Profile</h1>
          <p className="text-gray-600">Manage profile and learning preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 space-y-6">
            {/* Avatar */}
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center mx-auto mb-4 text-5xl">
                {isEditing ? (
                  <select
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="bg-transparent text-5xl appearance-none cursor-pointer"
                  >
                    {avatars.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                ) : (
                  formData.avatar
                )}
              </div>
              {isEditing && (
                <button
                  onClick={handleSave}
                  className="btn btn-primary w-full"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                {isEditing ? (
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                  />
                ) : (
                  <p className="text-gray-900">{child.name}</p>
                )}
              </div>
              <div>
                <label className="label">Age</label>
                {isEditing ? (
                  <select
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className="input"
                  >
                    {Array.from({ length: 5 }, (_, i) => i + 2).map(age => (
                      <option key={age} value={age}>{age} years</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{child.age} years old</p>
                )}
              </div>
              <div>
                <label className="label">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="input"
                  />
                ) : (
                  <p className="text-gray-900">{child.dob}</p>
                )}
              </div>
              <div>
                <label className="label">Learning Stage</label>
                {isEditing ? (
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="input"
                  >
                    {stages.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 capitalize">{child.stage}</p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${child.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {child.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {isEditing && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Settings & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preferences */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-6 h-6 text-primary-500" />
                Learning Preferences
              </h2>
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="btn btn-ghost btn-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Preferred Language</label>
                  {isEditing ? (
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="input"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{formData.language === 'en' ? 'English' : 'Hindi'}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary-500" />
                  Accessibility
                </h3>
                <div className="space-y-4">
                  {[
                    { key: 'audioEnabled', label: 'Audio Narration', desc: 'Play audio for lessons and activities', icon: Volume2 },
                    { key: 'reducedMotion', label: 'Reduced Motion', desc: 'Minimize animations and transitions', icon: Eye },
                    { key: 'highContrast', label: 'High Contrast', desc: 'Increase color contrast for visibility', icon: EyeOff },
                    { key: 'isActive', label: 'Active Profile', desc: 'Enable or disable this profile', icon: User },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pastel-blue flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={formData[item.key as keyof typeof formData] as boolean}
                          onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        <span className={`badge ${(formData[item.key as keyof typeof formData] as boolean) ? 'badge-success' : 'badge-secondary'}`}>
                          {(formData[item.key as keyof typeof formData] as boolean) ? 'On' : 'Off'}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary mt-6 w-full sm:w-auto"
              >
                <Edit className="w-5 h-5" />
                Edit Preferences
              </button>
            )}
          </div>

          {/* Login Access */}
          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-primary-500" />
              Student Login Access
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl mb-4">
              <p className="text-gray-600 mb-3">Your child can log in using:</p>
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200">
                <span className="font-mono text-lg font-semibold text-gray-900 bg-gray-50 px-3 py-1.5 rounded">AARAV</span>
                <span className="text-gray-500">+ 4-digit PIN</span>
              </div>
            </div>
            <div className="space-y-3">
              <button className="btn btn-outline w-full">
                Set/Change PIN
              </button>
              <button className="btn btn-ghost w-full text-red-600 hover:bg-red-50">
                Disable Student Login
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border border-red-100">
            <h2 className="text-xl font-display font-bold text-red-600 mb-4 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              Danger Zone
            </h2>
            <p className="text-gray-600 mb-4">These actions are irreversible. Please be careful.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="btn btn-ghost border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto">
                <Trash2 className="w-5 h-5" />
                Deactivate Profile
              </button>
              <button className="btn btn-ghost border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto">
                Delete Profile Permanently
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}