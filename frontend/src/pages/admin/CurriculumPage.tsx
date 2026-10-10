import { Plus, BookOpen, Edit, Trash2, Eye, ArrowLeft, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const stages = [
  { code: 'playgroup', name: 'Playgroup / Pre-Nursery', subjects: 4, lessons: 12, status: 'active' },
  { code: 'nursery', name: 'Nursery', subjects: 5, lessons: 18, status: 'active' },
  { code: 'lkg', name: 'Lower Kindergarten (LKG)', subjects: 6, lessons: 24, status: 'active' },
  { code: 'ukg', name: 'Upper Kindergarten (UKG)', subjects: 6, lessons: 22, status: 'active' },
];

const subjects = [
  { id: 1, stage: 'playgroup', name: 'English', domain: 'Language', topics: 3, lessons: 4, status: 'active' },
  { id: 2, stage: 'playgroup', name: 'Hindi', domain: 'Language', topics: 3, lessons: 4, status: 'active' },
  { id: 3, stage: 'nursery', name: 'English', domain: 'Language', topics: 4, lessons: 6, status: 'active' },
  { id: 4, stage: 'nursery', name: 'Mathematics', domain: 'Mathematics', topics: 5, lessons: 8, status: 'active' },
];

const lessons = [
  { id: 1, title: 'Counting 1-10', subject: 'Mathematics', stage: 'nursery', status: 'published', activities: 4, updated: '2024-01-15' },
  { id: 2, title: 'Letter Sounds A-E', subject: 'English', stage: 'nursery', status: 'published', activities: 3, updated: '2024-01-14' },
  { id: 3, title: 'Shapes & Colors', subject: 'Mathematics', stage: 'nursery', status: 'draft', activities: 3, updated: '2024-01-13' },
  { id: 4, title: 'My Family', subject: 'EVS', stage: 'nursery', status: 'published', activities: 3, updated: '2024-01-12' },
];

export default function CurriculumPage() {
  const [activeTab, setActiveTab] = useState<'stages' | 'subjects' | 'lessons'>('lessons');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="btn btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Curriculum Management</h1>
            <p className="text-gray-600 mt-1">Manage stages, subjects, lessons, and activities</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Add Content
        </button>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <nav className="flex border-b border-gray-100" aria-label="Curriculum sections">
          {[
            { id: 'stages', label: 'Stages', icon: BookOpen, count: stages.length },
            { id: 'subjects', label: 'Subjects', icon: BookOpen, count: subjects.length },
            { id: 'lessons', label: 'Lessons', icon: BookOpen, count: lessons.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'stages' | 'subjects' | 'lessons')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">{tab.count}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          {/* Stages Tab */}
          {activeTab === 'stages' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stages.map(stage => (
                  <div key={stage.code} className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                      <span className={`badge ${stage.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{stage.status}</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>{stage.subjects} subjects</p>
                      <p>{stage.lessons} lessons</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/admin/curriculum/stages/${stage.code}`} className="btn btn-primary btn-sm flex-1 justify-center">Manage</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Domain</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Topics</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Lessons</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(subject => (
                      <tr key={subject.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{subject.name}</td>
                        <td className="p-4 text-gray-600 capitalize">{subject.stage}</td>
                        <td className="p-4 text-gray-600">{subject.domain}</td>
                        <td className="p-4 text-gray-600">{subject.topics}</td>
                        <td className="p-4 text-gray-600">{subject.lessons}</td>
                        <td className="p-4">
                          <span className={`badge ${subject.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{subject.status}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/curriculum/subjects/${subject.id}`} className="btn btn-ghost btn-sm"><Eye className="w-4 h-4" /></Link>
                            <button className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Lesson</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Activities</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.filter(l => l.title.toLowerCase().includes(search.toLowerCase())).map(lesson => (
                      <tr key={lesson.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{lesson.title}</td>
                        <td className="p-4 text-gray-600">{lesson.subject}</td>
                        <td className="p-4 text-gray-600 capitalize">{lesson.stage}</td>
                        <td className="p-4">
                          <span className={`badge ${
                            lesson.status === 'published' ? 'badge-success' :
                            lesson.status === 'draft' ? 'badge-secondary' : 'badge-warning'
                          }`}>{lesson.status}</span>
                        </td>
                        <td className="p-4 text-gray-600">{lesson.activities}</td>
                        <td className="p-4 text-gray-600">{lesson.updated}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/curriculum/lessons/${lesson.id}`} className="btn btn-ghost btn-sm"><Eye className="w-4 h-4" /></Link>
                            <button className="btn btn-ghost btn-sm"><Edit className="w-4 h-4" /></button>
                            <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">Add New Content</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-6 space-y-4">
              <div>
                <label className="label">Content Type</label>
                <select className="input">
                  <option value="stage">Learning Stage</option>
                  <option value="subject">Subject</option>
                  <option value="lesson">Lesson</option>
                  <option value="activity">Activity</option>
                </select>
              </div>
              <div>
                <label className="label">Title</label>
                <input type="text" className="input" placeholder="Enter title" required />
              </div>
              <div>
                <label className="label">Stage</label>
                <select className="input">
                  {stages.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject (if applicable)</label>
                <select className="input">
                  <option value="">Select stage first</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}