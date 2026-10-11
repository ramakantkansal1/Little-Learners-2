import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Save, X, User, Globe, Volume2, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { parentApi, type Child, type ChildUpdateRequest } from '@services';

const stages = [
  { id: 1, code: 'playgroup', name: 'Playgroup / Pre-Nursery (2-3 years)' },
  { id: 2, code: 'nursery', name: 'Nursery (3-4 years)' },
  { id: 3, code: 'lkg', name: 'LKG (4-5 years)' },
  { id: 4, code: 'ukg', name: 'UKG (5-6 years)' },
];

const avatars = ['👦', '👧', '🐘', '🦉', '🐰', '🐯', '🐻', '🐨', '🦁', '🐵'];

const avatarTypeMap: Record<string, string> = {
  boy: '👦',
  girl: '👧',
  elephant: '🐘',
  owl: '🦉',
  rabbit: '🐰',
  tiger: '🐯',
  bear: '🐻',
  koala: '🐨',
  lion: '🦁',
  monkey: '🐵',
};

export default function ChildProfilePage() {
  const { childId } = useParams<{ childId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: undefined as number | undefined,
    stage: '',
    avatar: 'boy',
    dob: '',
    language: 'en',
    audioEnabled: true,
    reducedMotion: false,
    highContrast: false,
    isActive: true,
  });
  const [pinFormData, setPinFormData] = useState({
    pin: '',
    confirmPin: '',
  });

  // Fetch child data on mount
  useEffect(() => {
    if (childId) {
      parentApi.getChild(parseInt(childId))
        .then(response => {
          const childData = response.data;
          setChild(childData);
          // Calculate age from date of birth
          let age: number | undefined;
          if (childData.date_of_birth) {
            age = new Date().getFullYear() - new Date(childData.date_of_birth).getFullYear();
          }
          setFormData({
            name: childData.display_name,
            age,
            stage: childData.current_stage_code || 'playgroup',
            avatar: childData.avatar_type || 'boy',
            dob: childData.date_of_birth || '',
            language: childData.preferred_language,
            audioEnabled: childData.audio_enabled,
            reducedMotion: childData.reduced_motion,
            highContrast: childData.high_contrast,
            isActive: childData.is_active,
          });
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          setError('Failed to load child profile');
        });
    }
  }, [childId]);

  const handleSave = async () => {
    if (!childId || !child) return;
    
    try {
      setSaving(true);
      setError(null);

      // Calculate date of birth from age
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - (formData.age || 0));
      const dateOfBirth = dob.toISOString().split('T')[0];

      // Map stage code to stage ID
      const stageId = stages.find(s => s.code === formData.stage)?.id || 1;

      const updateData: ChildUpdateRequest = {
        display_name: formData.name,
        date_of_birth: dateOfBirth,
        current_stage_id: stageId,
        avatar_type: formData.avatar,
        preferred_language: formData.language,
        is_active: formData.isActive,
      };

      await parentApi.updateChild(parseInt(childId), updateData);
      setIsEditing(false);
      
      // Refresh child data
      const response = await parentApi.getChild(parseInt(childId));
      setChild(response.data);
    } catch (err) {
      setError('Failed to save changes. Please try again.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePinSave = async () => {
    if (!childId || !child) return;
    
    if (pinFormData.pin !== pinFormData.confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    
    if (pinFormData.pin.length < 4 || pinFormData.pin.length > 6 || !/^\d+$/.test(pinFormData.pin)) {
      setPinError('PIN must be 4-6 digits');
      return;
    }
    
    try {
      setPinSaving(true);
      setPinError(null);

      const updateData: ChildUpdateRequest = {
        pin: pinFormData.pin,
      };

      await parentApi.updateChild(parseInt(childId), updateData);
      setShowPinModal(false);
      setPinFormData({ pin: '', confirmPin: '' });
      
      // Refresh child data
      const response = await parentApi.getChild(parseInt(childId));
      setChild(response.data);
    } catch (err) {
      setPinError('Failed to set PIN. Please try again.');
      console.error('PIN save error:', err);
    } finally {
      setPinSaving(false);
    }
  };

  const handleCancel = () => {
    if (child) {
      const age = child.date_of_birth 
        ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()
        : undefined;
      setFormData({
        name: child.display_name,
        age,
        stage: child.current_stage_code || 'playgroup',
        avatar: child.avatar_type || 'boy',
        dob: child.date_of_birth || '',
        language: child.preferred_language,
        audioEnabled: child.audio_enabled,
        reducedMotion: child.reduced_motion,
        highContrast: child.high_contrast,
        isActive: child.is_active,
      });
    }
    setIsEditing(false);
  };

  const getAvatarEmoji = (avatarType: string | undefined): string => {
    return avatarTypeMap[avatarType || 'boy'] || '👦';
  };

  const getStageName = (stageCode: string | null | undefined): string => {
    return stages.find(s => s.code === stageCode)?.name || 'Unknown Stage';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pastel-blue mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Child not found'}</p>
          <Link to="/parent/children" className="btn btn-primary">
            <ArrowLeft className="w-5 h-5" />
            Back to Children
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/parent/children" className="btn btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{child.display_name}'s Profile</h1>
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
                      {avatars.map(a => <option key={a} value={a}>{avatarTypeMap[a]}</option>)}
                    </select>
                  ) : (
                    getAvatarEmoji(formData.avatar)
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="btn btn-primary w-full"
                    disabled={saving}
                  >
                    {saving ? (
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
                      required
                      disabled={saving}
                    />
                  ) : (
                    <p className="text-gray-900">{child.display_name}</p>
                  )}
                </div>
                <div>
                  <label className="label">Age</label>
                  {isEditing ? (
                    <select
                      value={formData.age || ''}
                      onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || undefined })}
                      className="input"
                      required
                      disabled={saving}
                    >
                      <option value="">Select age</option>
                      {Array.from({ length: 5 }, (_, i) => i + 2).map(age => (
                        <option key={age} value={age}>{age} years</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">
                      {child.date_of_birth 
                        ? `${new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()} years old`
                        : 'Age unknown'}
                    </p>
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
                      disabled={saving}
                    />
                  ) : (
                    <p className="text-gray-900">{child.date_of_birth || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="label">Learning Stage</label>
                  {isEditing ? (
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="input"
                      required
                      disabled={saving}
                    >
                      {stages.map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{getStageName(child.current_stage_code)}</p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${child.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {child.is_active ? 'Active' : 'Inactive'}
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
                        disabled={saving}
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
                            disabled={saving}
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
                  <span className="font-mono text-lg font-semibold text-gray-900 bg-gray-50 px-3 py-1.5 rounded">{child.display_name.toUpperCase()}</span>
                  <span className="text-gray-500">+ 4-digit PIN</span>
                </div>
              </div>
              <div className="space-y-3">
                <button 
                  className="btn btn-outline w-full"
                  onClick={() => setShowPinModal(true)}
                >
                  Set/Change PIN
                </button>
                <button className="btn btn-ghost w-full text-red-600 hover:bg-red-50" disabled>
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
                <button className="btn btn-ghost border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto" disabled>
                  <Trash2 className="w-5 h-5" />
                  Deactivate Profile
                </button>
                <button className="btn btn-ghost border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto" disabled>
                  <Trash2 className="w-5 h-5" />
                  Delete Profile Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">Set/Change PIN</h2>
              <button
                onClick={() => setShowPinModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handlePinSave(); }} className="p-6 space-y-4">
              <div>
                <label htmlFor="pin" className="label">
                  New PIN <span className="text-sm text-gray-400">(4-6 digits)</span>
                </label>
                <input
                  type="password"
                  id="pin"
                  value={pinFormData.pin}
                  onChange={(e) => setPinFormData({ ...pinFormData, pin: e.target.value })}
                  className={`input ${pinError ? 'input-error' : ''}`}
                  placeholder="••••"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={pinSaving}
                />
                {pinError && (
                  <p className="mt-1.5 text-sm text-red-500">{pinError}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPin" className="label">Confirm PIN</label>
                <input
                  type="password"
                  id="confirmPin"
                  value={pinFormData.confirmPin}
                  onChange={(e) => setPinFormData({ ...pinFormData, confirmPin: e.target.value })}
                  className={`input ${pinError ? 'input-error' : ''}`}
                  placeholder="••••"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={pinSaving}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="btn btn-secondary flex-1"
                  disabled={pinSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={pinSaving}
                >
                  {pinSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Set PIN'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}