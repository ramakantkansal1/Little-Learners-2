with open('frontend/src/pages/student/ActivityPage.test.tsx', 'r') as f:
    content = f.read()

# Remove unused imports and constants
content = content.replace("import type { AxiosResponse } from 'axios';\n", '')
content = content.replace('const TEST_TIMEOUT = 30000;\n\n', '')
content = content.replace('const TEST_TIMEOUT = 20000;\n\n', '')

# Remove unused factory functions
content = content.replace('''const createAttemptStartResponse = (activity = createMockActivity()) => ({
  data: {
    attempt_id: 1,
    activity,
    questions: activity.questions,
    saved_progress: null,
    lesson_progress: null,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

content = content.replace('''const createCompleteResponse = (overrides = {}) => ({
  data: {
    score: 100,
    passed: true,
    rewards_earned: [{ name: 'First Star', type: 'star', image_url: null }],
    next_activity_id: 2,
    streak: { current_streak: 1, longest_streak: 1, last_activity_date: '2024-01-15' },
    ...overrides,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

content = content.replace('''const createRecommendationResponse = (overrides = {}) => ({
  data: {
    activity_id: 2,
    reason: 'advance_next',
    confidence: 'high',
    mastery_score: 0.95,
    tier: 'advance',
    has_evidence: true,
    activity: {
      id: 2,
      code: 'activity-002',
      type: 'simple_quiz',
      title: 'Simple Quiz',
      instructions: 'Answer the questions',
      estimated_duration_minutes: 5,
      configuration: null,
      questions: [],
    },
    ...overrides,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

content = content.replace('''const createNoActivityRecommendation = (overrides = {}) => ({
  data: {
    activity_id: null,
    reason: 'no_more_activities',
    confidence: 'low',
    mastery_score: null,
    tier: 'cold_start',
    has_evidence: false,
    activity: null,
    ...overrides,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

# Remove TEST_TIMEOUT
content = content.replace('const TEST_TIMEOUT = 30000;\n\n', '')
content = content.replace('const TEST_TIMEOUT = 20000;\n\n', '')

# Remove unused imports
content = content.replace("import type { AxiosResponse } from 'axios';\n", '')

# Remove unused factory functions that are declared but not used
content = content.replace('const createAttemptStartResponse = (activity = createMockActivity()) => ({\n  data: {\n    attempt_id: 1,\n    activity,\n    questions: activity.questions,\n    saved_progress: null,\n    lesson_progress: null,\n  },\n  status: 200,\n  statusText: \'OK\',\n  headers: {},\n  config: { headers: {} },\n});\n\n', '')

content = content.replace('''const createCompleteResponse = (overrides = {}) => ({
  data: {
    score: 100,
    passed: true,
    rewards_earned: [{ name: 'First Star', type: 'star', image_url: null }],
    next_activity_id: 2,
    streak: { current_streak: 1, longest_streak: 1, last_activity_date: '2024-01-15' },
    ...overrides,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

content = content.replace('''const createRecommendationResponse = (overrides = {}) => ({
  data: {
    activity_id: 2,
    reason: 'advance_next',
    confidence: 'high',
    mastery_score: 0.95,
    tier: 'advance',
    has_evidence: true,
    activity: {
      id: 2,
      code: 'activity-002',
      type: 'simple_quiz',
      title: 'Simple Quiz',
      instructions: 'Answer the questions',
      estimated_duration_minutes: 5,
      configuration: null,
      questions: [],
    },
    ...overrides,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

content = content.replace('''const createNoActivityRecommendation = (overrides = {}) => ({
  data: {
    activity_id: null,
    reason: 'no_more_activities',
    confidence: 'low',
    mastery_score: null,
    tier: 'cold_start',
    has_evidence: false,
    activity: null,
    ...overrides,
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} },
});\n\n''', '')

# Remove TEST_TIMEOUT constants
content = content.replace('const TEST_TIMEOUT = 30000;\n\n', '')
content = content.replace('const TEST_TIMEOUT = 20000;\n\n', '')

# Remove unused imports
content = content.replace("import type { AxiosResponse } from 'axios';\n", '')

with open('frontend/src/pages/student/ActivityPage.test.tsx', 'w') as f:
    f.write(content)
print('Done')