import { Shield, Globe, Mail, Lock, Save, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'security' | 'content' | 'privacy'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const settings = {
    general: {
      platformName: 'Happy Little Learners',
      supportEmail: 'support@happylittlelearners.in',
      defaultLanguage: 'en',
      timezone: 'Asia/Kolkata',
      maintenanceMode: false,
      registrationEnabled: true,
    },
    email: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'noreply@happylittlelearners.in',
      smtpPassword: '••••••••',
      fromEmail: 'noreply@happylittlelearners.in',
      fromName: 'Happy Little Learners',
      emailVerification: true,
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      require2FA: false,
      corsOrigins: 'http://localhost:5173,https://happylittlelearners.in',
    },
    content: {
      defaultStage: 'playgroup',
      autoPublish: false,
      contentReviewRequired: true,
      maxFileSize: 10,
      allowedImageTypes: 'jpg,jpeg,png,webp,svg',
      allowedAudioTypes: 'mp3,ogg,wav',
    },
    privacy: {
      dataRetentionDays: 365,
      analyticsEnabled: true,
      requireParentalConsent: true,
      gdprCompliance: true,
      dpdpCompliance: true,
    },
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setMessage({ type: 'success', text: 'Settings saved successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600 mt-1">Configure platform-wide settings and preferences</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6">
        {[
          { id: 'general', label: 'General', icon: Shield },
          { id: 'email', label: 'Email', icon: Mail },
          { id: 'security', label: 'Security', icon: Lock },
          { id: 'content', label: 'Content', icon: Globe },
          { id: 'privacy', label: 'Privacy', icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'general' | 'email' | 'security' | 'content' | 'privacy')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card p-6 max-w-3xl">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900">Platform Information</h3>
              <p className="text-sm text-gray-500 mt-1">Basic platform configuration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Platform Name</label>
                <input defaultValue={settings.general.platformName} className="input" />
              </div>
              <div>
                <label className="label">Support Email</label>
                <input type="email" defaultValue={settings.general.supportEmail} className="input" />
              </div>
              <div>
                <label className="label">Default Language</label>
                <select defaultValue={settings.general.defaultLanguage} className="input">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select defaultValue={settings.general.timezone} className="input">
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Feature Toggles</h3>
              <div className="space-y-4">
                {[
                  { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disable access for non-admin users' },
                  { key: 'registrationEnabled', label: 'Enable Registration', desc: 'Allow new parent registrations' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={settings.general[item.key as keyof typeof settings.general] as boolean}
                      className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save General Settings
                </>
              )}
            </button>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900">SMTP Configuration</h3>
              <p className="text-sm text-gray-500 mt-1">Configure email delivery settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">SMTP Host</label>
                <input defaultValue={settings.email.smtpHost} className="input" />
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input type="number" defaultValue={settings.email.smtpPort} className="input" />
              </div>
              <div>
                <label className="label">SMTP Username</label>
                <input defaultValue={settings.email.smtpUser} className="input" />
              </div>
              <div>
                <label className="label">SMTP Password</label>
                <input type="password" defaultValue={settings.email.smtpPassword} className="input" />
              </div>
              <div>
                <label className="label">From Email</label>
                <input type="email" defaultValue={settings.email.fromEmail} className="input" />
              </div>
              <div>
                <label className="label">From Name</label>
                <input defaultValue={settings.email.fromName} className="input" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Enable Email Verification</p>
                  <p className="text-sm text-gray-500">Require email verification for new accounts</p>
                </div>
                <input type="checkbox" defaultChecked={settings.email.emailVerification} className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
              </label>
            </div>

            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Email Settings'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900">Authentication & Security</h3>
              <p className="text-sm text-gray-500 mt-1">Configure security policies</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Session Timeout (minutes)</label>
                <input type="number" defaultValue={settings.security.sessionTimeout} className="input" min="5" max="480" />
              </div>
              <div>
                <label className="label">Max Login Attempts</label>
                <input type="number" defaultValue={settings.security.maxLoginAttempts} className="input" min="3" max="10" />
              </div>
              <div>
                <label className="label">Lockout Duration (minutes)</label>
                <input type="number" defaultValue={settings.security.lockoutDuration} className="input" min="5" max="60" />
              </div>
              <div>
                <label className="label">Min Password Length</label>
                <input type="number" defaultValue={settings.security.passwordMinLength} className="input" min="6" max="32" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Advanced Security</h3>
              <div className="space-y-4">
                {[
                  { key: 'require2FA', label: 'Require 2FA for Admins', desc: 'Enforce two-factor authentication for admin accounts' },
                  { key: 'corsOrigins', label: 'CORS Origins', desc: 'Comma-separated list of allowed origins' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    {item.key === 'require2FA' ? (
                      <input type="checkbox" defaultChecked={settings.security.require2FA} className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                    ) : (
                      <input defaultValue={settings.security.corsOrigins} className="input w-64" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Security Settings'}
            </button>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900">Content Management</h3>
              <p className="text-sm text-gray-500 mt-1">Configure content defaults and upload limits</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Default Learning Stage</label>
                <select defaultValue={settings.content.defaultStage} className="input">
                  <option value="playgroup">Playgroup / Pre-Nursery</option>
                  <option value="nursery">Nursery</option>
                  <option value="lkg">LKG</option>
                  <option value="ukg">UKG</option>
                </select>
              </div>
              <div>
                <label className="label">Max File Size (MB)</label>
                <input type="number" defaultValue={settings.content.maxFileSize} className="input" min="1" max="100" />
              </div>
              <div>
                <label className="label">Allowed Image Types</label>
                <input defaultValue={settings.content.allowedImageTypes} className="input" />
                <p className="text-sm text-gray-500 mt-1">Comma-separated extensions</p>
              </div>
              <div>
                <label className="label">Allowed Audio Types</label>
                <input defaultValue={settings.content.allowedAudioTypes} className="input" />
                <p className="text-sm text-gray-500 mt-1">Comma-separated extensions</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="space-y-4">
                {[
                  { key: 'autoPublish', label: 'Auto-publish Content', desc: 'Automatically publish new content without review' },
                  { key: 'contentReviewRequired', label: 'Require Content Review', desc: 'All content must be reviewed before publishing' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked={settings.content[item.key as keyof typeof settings.content] as boolean} className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Content Settings'}
            </button>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900">Privacy & Compliance</h3>
              <p className="text-sm text-gray-500 mt-1">Configure data protection and privacy settings</p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'dataRetentionDays', label: 'Data Retention (days)', type: 'number' as const, defaultValue: settings.privacy.dataRetentionDays, min: 30, max: 2555 },
                { key: 'analyticsEnabled', label: 'Enable Analytics', type: 'checkbox' as const, defaultValue: settings.privacy.analyticsEnabled, desc: 'Collect anonymous usage analytics' },
                { key: 'requireParentalConsent', label: 'Require Parental Consent', type: 'checkbox' as const, defaultValue: settings.privacy.requireParentalConsent, desc: 'Mandatory consent for children data collection' },
                { key: 'gdprCompliance', label: 'GDPR Compliance', type: 'checkbox' as const, defaultValue: settings.privacy.gdprCompliance, desc: 'Enable GDPR compliance features' },
                { key: 'dpdpCompliance', label: 'DPDP Act Compliance', type: 'checkbox' as const, defaultValue: settings.privacy.dpdpCompliance, desc: 'Enable India DPDP Act compliance features' },
              ].map(item => {
                if (item.type === 'number') {
                  return (
                    <div key={item.key} className="p-4 bg-gray-50 rounded-xl">
                      <label className="label">{item.label}</label>
                      <input type="number" defaultValue={item.defaultValue} min={item.min} max={item.max} className="input w-32" />
                    </div>
                  );
                }
                return (
                  <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      {item.desc && <p className="text-sm text-gray-500">{item.desc}</p>}
                    </div>
                    <input type="checkbox" defaultChecked={item.defaultValue} className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                  </label>
                );
              })}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Data Management</h3>
              <div className="space-y-3">
                <button className="btn btn-outline w-full justify-start">Generate Privacy Report</button>
                <button className="btn btn-outline w-full justify-start border-red-200 text-red-600 hover:bg-red-50">Export All User Data</button>
              </div>
            </div>

            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Privacy Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}