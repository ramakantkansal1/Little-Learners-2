import { Search, Download, Shield, User, X, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const auditLogs = [
  { id: 1, time: '2024-01-15 14:32:10', user: 'admin', action: 'CREATE', resource: 'Lesson', resourceName: 'Counting 1-20', details: 'Created new lesson in Mathematics', ip: '192.168.1.100', success: true },
  { id: 2, time: '2024-01-15 14:28:45', user: 'admin', action: 'PUBLISH', resource: 'Lesson', resourceName: 'Letter Sounds A-E', details: 'Published lesson for Nursery English', ip: '192.168.1.100', success: true },
  { id: 3, time: '2024-01-15 13:15:22', user: 'content_team', action: 'UPLOAD', resource: 'Media', resourceName: 'apple-red.png', details: 'Uploaded image for counting activity', ip: '192.168.1.105', success: true },
  { id: 4, time: '2024-01-15 12:45:10', user: 'admin', action: 'ROLE_ASSIGN', resource: 'User', resourceName: 'rahul@example.com', details: 'Assigned parent role to new user', ip: '192.168.1.100', success: true },
  { id: 5, time: '2024-01-15 11:30:05', user: 'reviewer', action: 'APPROVE', resource: 'Lesson', resourceName: 'Hindi Swar', details: 'Approved lesson for publication', ip: '192.168.1.110', success: true },
  { id: 6, time: '2024-01-15 10:15:33', user: 'admin', action: 'DELETE', resource: 'Media', resourceName: 'old-image.jpg', details: 'Deleted unused media asset', ip: '192.168.1.100', success: true },
  { id: 7, time: '2024-01-15 09:45:20', user: 'admin', action: 'LOGIN', resource: 'Auth', resourceName: 'admin@happylittlelearners.in', details: 'Successful admin login', ip: '192.168.1.100', success: true },
  { id: 8, time: '2024-01-14 16:20:15', user: 'content_team', action: 'UPDATE', resource: 'Subject', resourceName: 'Mathematics', details: 'Updated subject description', ip: '192.168.1.105', success: true },
  { id: 9, time: '2024-01-14 15:10:40', user: 'admin', action: 'SETTINGS_CHANGE', resource: 'Platform', resourceName: 'Email Config', details: 'Updated SMTP settings', ip: '192.168.1.100', success: true },
  { id: 10, time: '2024-01-14 14:05:30', user: 'reviewer', action: 'REJECT', resource: 'Lesson', resourceName: 'Advanced Shapes', details: 'Rejected lesson - needs revision', ip: '192.168.1.110', success: false },
];

const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'PUBLISH', 'LOGIN', 'ROLE_ASSIGN', 'SETTINGS_CHANGE'];
const resources = ['Lesson', 'Subject', 'User', 'Media', 'Activity', 'Platform', 'Auth'];

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<typeof auditLogs[0] | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter;
    return matchesSearch && matchesAction && matchesResource;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'PUBLISH': return 'bg-blue-100 text-blue-700';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'LOGIN': return 'bg-purple-100 text-purple-700';
      case 'ROLE_ASSIGN': return 'bg-indigo-100 text-indigo-700';
      case 'SETTINGS_CHANGE': return 'bg-orange-100 text-orange-700';
      case 'APPROVE': return 'bg-emerald-100 text-emerald-700';
      case 'REJECT': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Track all administrative actions and system events</p>
        </div>
        <button className="btn btn-secondary">
          <Download className="w-5 h-5" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, resource, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input w-auto">
            <option value="all">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} className="input w-auto">
            <option value="all">All Resources</option>
            {resources.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input w-auto">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 sticky top-0 bg-white">
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="p-4 text-sm text-gray-600 font-mono">{log.time}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{log.user}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{log.resource}</span>
                      <span className="text-gray-400 text-sm">/{log.resourceName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 max-w-xs truncate">{log.details}</td>
                  <td className="p-4 text-sm font-mono text-gray-500">{log.ip}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.success ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Success
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Failed
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {filteredLogs.length} of {auditLogs.length} entries</p>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">Audit Log Details</h2>
              <button onClick={() => setSelectedLog(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="font-mono text-gray-900">{selectedLog.time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium text-gray-900">{selectedLog.user}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Action</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource</p>
                  <p className="font-medium text-gray-900">{selectedLog.resource} / {selectedLog.resourceName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IP Address</p>
                  <p className="font-mono text-gray-900">{selectedLog.ip}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${selectedLog.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Details</p>
                <p className="text-gray-900">{selectedLog.details}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}