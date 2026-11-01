import {
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  Download,
  BarChart,
  PieChart,
} from "lucide-react";
import { useState } from "react";

const analyticsData = {
  registrations: [
    { month: "Aug", parents: 45, children: 78 },
    { month: "Sep", parents: 52, children: 92 },
    { month: "Oct", parents: 61, children: 105 },
    { month: "Nov", parents: 58, children: 98 },
    { month: "Dec", parents: 67, children: 112 },
    { month: "Jan", parents: 72, children: 125 },
  ],
  engagement: [
    { week: "Week 1", activeUsers: 120, sessions: 340, avgTime: 18 },
    { week: "Week 2", activeUsers: 135, sessions: 380, avgTime: 20 },
    { week: "Week 3", activeUsers: 128, sessions: 360, avgTime: 19 },
    { week: "Week 4", activeUsers: 142, sessions: 410, avgTime: 22 },
  ],
  lessonCompletion: [
    { lesson: "Counting 1-10", started: 450, completed: 380, rate: 84 },
    { lesson: "Letter Sounds A-E", started: 420, completed: 350, rate: 83 },
    { lesson: "Shapes & Colors", started: 380, completed: 320, rate: 84 },
    { lesson: "My Family", started: 350, completed: 290, rate: 83 },
    { lesson: "Rhyming Words", started: 300, completed: 240, rate: 80 },
  ],
  stageDistribution: [
    { stage: "Playgroup", children: 245 },
    { stage: "Nursery", children: 420 },
    { stage: "LKG", children: 380 },
    { stage: "UKG", children: 290 },
  ],
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");
  const [activeTab, setActiveTab] = useState<
    "overview" | "engagement" | "content" | "users"
  >("overview");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Platform insights and learning metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="btn btn-secondary">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6">
        {["overview", "engagement", "content", "users"].map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(
                tab as "overview" | "engagement" | "content" | "users",
              )
            }
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Registrations</p>
                  <p className="text-3xl font-display font-bold text-gray-900">
                    1,342
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-pastel-blue flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <p className="mt-2 text-sm text-green-600">+12% vs last period</p>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Children</p>
                  <p className="text-3xl font-display font-bold text-gray-900">
                    1,335
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-pastel-green flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <p className="mt-2 text-sm text-green-600">+8% vs last period</p>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Session Time</p>
                  <p className="text-3xl font-display font-bold text-gray-900">
                    22 min
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-pastel-pink flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <p className="mt-2 text-sm text-green-600">
                +3 min vs last period
              </p>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completion Rate</p>
                  <p className="text-3xl font-display font-bold text-gray-900">
                    78%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-pastel-yellow flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <p className="mt-2 text-sm text-green-600">+2% vs last period</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart className="w-6 h-6 text-primary-500" />
                Registrations Trend
              </h2>
              <div className="h-64 flex items-end justify-between gap-2">
                {analyticsData.registrations.map((month, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-full bg-pastel-blue rounded-t transition-all duration-300 hover:bg-primary-500"
                      style={{
                        height: `${(month.parents / 72) * 100}%`,
                        minHeight: "4px",
                      }}
                    />
                    <span className="text-xs text-gray-500">{month.month}</span>
                    <span className="text-xs text-gray-400">
                      {month.parents} parents
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                <PieChart className="w-6 h-6 text-primary-500" />
                Stage Distribution
              </h2>
              <div className="flex items-center justify-center h-64 gap-4">
                <div className="flex-1 max-w-xs">
                  {analyticsData.stageDistribution.map((stage, index) => (
                    <div key={index} className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-4 h-4 rounded ${["bg-pastel-blue", "bg-pastel-green", "bg-pastel-pink", "bg-pastel-yellow"][index]}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {stage.stage}
                        </p>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pastel-blue rounded-full"
                            style={{
                              width: `${(stage.children / 420) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                        {stage.children}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === "engagement" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-6">
              Weekly Engagement
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Active Users
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Avg Session Time
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.engagement.map((week, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="p-4 font-medium text-gray-900">
                        {week.week}
                      </td>
                      <td className="p-4">{week.activeUsers}</td>
                      <td className="p-4">{week.sessions}</td>
                      <td className="p-4">{week.avgTime} min</td>
                      <td className="p-4 font-semibold text-green-600">82%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-6">
              Lesson Completion Rates
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Lesson
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.lessonCompletion.map((lesson, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="p-4 font-medium text-gray-900">
                        {lesson.lesson}
                      </td>
                      <td className="p-4">{lesson.started}</td>
                      <td className="p-4">{lesson.completed}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pastel-blue rounded-full"
                              style={{ width: `${lesson.rate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-gray-900 w-12 text-right">
                            {lesson.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">87%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-6">
              User Retention
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-5">
                <p className="text-sm text-gray-500">Day 1 Retention</p>
                <p className="text-3xl font-display font-bold text-gray-900">
                  78%
                </p>
              </div>
              <div className="card p-5">
                <p className="text-sm text-gray-500">Day 7 Retention</p>
                <p className="text-3xl font-display font-bold text-gray-900">
                  52%
                </p>
              </div>
              <div className="card p-5">
                <p className="text-sm text-gray-500">Day 30 Retention</p>
                <p className="text-3xl font-display font-bold text-gray-900">
                  31%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
