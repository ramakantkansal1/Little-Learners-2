import { Link } from 'react-router-dom';
import { Plus, User, Edit } from 'lucide-react';
import { useState } from 'react';

const children = [
  { id: 1, name: 'Aarav', age: 4, stage: 'Nursery', avatar: '👦', progress: 65, isActive: true },
  { id: 2, name: 'Anaya', age: 6, stage: 'UKG', avatar: '👧', progress: 82, isActive: true },
];

const stages = [
  { code: 'playgroup', name: 'Playgroup / Pre-Nursery (2-3)' },
  { code: 'nursery', name: 'Nursery (3-4)' },
  { code: 'lkg', name: 'LKG (4-5)' },
  { code: 'ukg', name: 'UKG (5-6)' },
];

export default function ChildrenPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChild, setEditingChild] = useState<typeof children[0] | null>(null);

  const handleAddChild = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newChild = {
      id: Date.now(),
      name: formData.get('name') as string,
      age: parseInt(formData.get('age') as string),
      stage: formData.get('stage') as string,
      avatar: formData.get('avatar') as string || '👶',
      progress: 0,
      isActive: true,
    };
    children.push(newChild);
    setShowAddModal(false);
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">My Children</h1>
          <p className="text-gray-600 mt-1">Manage your children's profiles and learning stages</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add Child
        </button>
      </div>

      {children.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">No children added yet</h3>
          <p className="text-gray-600 mb-6">Add your first child to start their learning journey</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            Add Child
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map(child => (
            <div key={child.id} className="card p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center text-3xl flex-shrink-0">
                  {child.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-display font-bold text-gray-900">{child.name}</h3>
                    <span className="badge badge-primary">{child.stage}</span>
                  </div>
                  <p className="text-sm text-gray-500">Age {child.age}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-semibold text-gray-900">{child.progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pastel-blue to-pastel-green rounded-full"
                    style={{ width: `${child.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/parent/children/${child.id}`}
                  className="btn btn-primary flex-1 justify-center"
                >
                  View Progress
                </Link>
                <button
                  onClick={() => setEditingChild(child)}
                  className="btn btn-ghost"
                  aria-label="Edit profile"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Child Modal */}
      {(showAddModal || editingChild) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">
                {editingChild ? 'Edit Child' : 'Add New Child'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingChild(null); }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingChild ? () => {} : handleAddChild} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="label">Child's Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={editingChild?.name}
                  className="input"
                  required
                  placeholder="Enter name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="age" className="label">Age</label>
                  <select id="age" name="age" defaultValue={editingChild?.age} className="input" required>
                    <option value="">Select age</option>
                    {Array.from({ length: 5 }, (_, i) => i + 2).map(age => (
                      <option key={age} value={age}>{age} years</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stage" className="label">Learning Stage</label>
                  <select id="stage" name="stage" defaultValue={editingChild?.stage?.toLowerCase()} className="input" required>
                    <option value="">Select stage</option>
                    {stages.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="avatar" className="label">Avatar</label>
                <select id="avatar" name="avatar" defaultValue={editingChild?.avatar} className="input">
                  <option value="👦">👦 Boy</option>
                  <option value="👧">👧 Girl</option>
                  <option value="🐘">🐘 Elephant</option>
                  <option value="🦉">🦉 Owl</option>
                  <option value="🐰">🐰 Rabbit</option>
                  <option value="🐯">🐯 Tiger</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingChild(null); }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingChild ? 'Save Changes' : 'Add Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}