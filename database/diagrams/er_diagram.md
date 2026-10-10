# Database ER Diagram

```mermaid
erDiagram
    %% Users & Authentication
    users ||--o{ user_roles : has
    users ||--o| parent_profiles : "has one"
    users ||--o| student_profiles : "has one"
    users ||--o{ refresh_tokens : owns
    users ||--o{ password_resets : owns
    users ||--o| user_preferences : has

    roles ||--o{ user_roles : assigned_to

    user_roles {
        int id PK
        int user_id FK
        int role_id FK
        int assigned_by FK
        datetime assigned_at
    }

    users {
        int id PK
        string email UK
        string password_hash
        boolean is_active
        boolean is_verified
        datetime last_login_at
        int failed_login_attempts
        datetime locked_until
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    roles {
        int id PK
        string name UK
        string description
        boolean is_system
        datetime created_at
        datetime updated_at
    }

    refresh_tokens {
        int id PK
        int user_id FK
        string token_hash
        string jti UK
        datetime expires_at
        datetime revoked_at
        string user_agent
        string ip_address
        datetime created_at
        datetime updated_at
    }

    password_resets {
        int id PK
        int user_id FK
        string token_hash
        datetime expires_at
        datetime used_at
        string ip_address
        datetime created_at
        datetime updated_at
    }

    %% Profiles & Relationships
    parent_profiles ||--o{ parent_student_relationships : has
    student_profiles ||--o{ parent_student_relationships : belongs_to
    parent_profiles ||--o{ consent_records : gives
    student_profiles ||--o{ consent_records : receives
    parent_profiles ||--o{ parent_notifications : receives
    student_profiles ||--o{ student_enrollments : enrolled_in
    student_profiles ||--o{ student_lesson_progress : tracks
    student_profiles ||--o{ activity_attempts : attempts
    student_profiles ||--o{ student_reward_awards : earns
    parent_profiles ||--o{ data_deletion_requests : requests
    student_profiles ||--o{ data_deletion_requests : subject_of
    student_profiles ||--o| user_preferences : has

    parent_profiles {
        int id PK
        int user_id FK UK
        string full_name
        string phone_number
        boolean phone_verified
        date date_of_birth
        enum gender
        string avatar_url
        string address
        string city
        string state
        string pincode
        string country
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    student_profiles {
        int id PK
        int user_id FK UK
        string display_name
        date date_of_birth
        enum gender
        string avatar_url
        string avatar_type
        string pin_hash
        int current_stage_id FK
        string preferred_language
        boolean audio_enabled
        boolean reduced_motion
        boolean high_contrast
        boolean is_active
        datetime last_activity_at
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    parent_student_relationships {
        int id PK
        int parent_id FK
        int student_id FK
        string relationship_type
        boolean is_primary
        boolean can_manage_profile
        boolean can_view_progress
        boolean can_manage_settings
        datetime created_at
        datetime updated_at
    }

    consent_records {
        int id PK
        int parent_id FK
        int student_id FK
        string consent_type
        boolean consent_given
        string consent_version
        string ip_address
        string user_agent
        datetime withdrawn_at
        datetime created_at
        datetime updated_at
    }

    data_deletion_requests {
        int id PK
        int parent_id FK
        int student_id FK
        string request_type
        string status
        string reason
        datetime processed_at
        int processed_by FK
        string verification_token
        datetime verification_expires_at
        datetime created_at
        datetime updated_at
    }

    %% Curriculum
    learning_stages ||--o{ learning_domains : contains
    learning_stages ||--o{ subjects : contains
    learning_stages ||--o{ student_enrollments : enrolled_in
    learning_stages ||--o| student_profiles : current_stage

    learning_domains ||--o{ subjects : contains

    subjects ||--o{ topics : contains
    subjects ||--o{ student_enrollments : enrolled_in

    topics ||--o{ learning_objectives : defines
    topics ||--o{ lessons : contains

    learning_objectives ||--o{ lessons : linked_via

    lessons ||--o{ lesson_translations : translated_as
    lessons ||--o{ activities : contains
    lessons ||--o{ lesson_media : has
    lessons ||--o{ student_lesson_progress : tracked_in

    activities ||--o{ activity_translations : translated_as
    activities ||--o{ questions : contains
    activities ||--o{ activity_media : has
    activities ||--o{ activity_attempts : attempted_in

    questions ||--o{ question_translations : translated_as
    questions ||--o{ answer_options : has
    questions ||--o{ activity_responses : answered_in

    answer_options ||--o{ answer_option_translations : translated_as

    learning_stages {
        int id PK
        string code UK
        string name
        string description
        int min_age_months
        int max_age_months
        int display_order
        string icon
        string color
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    learning_domains {
        int id PK
        int stage_id FK
        string code
        string name
        string description
        int display_order
        string icon
        string color
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    subjects {
        int id PK
        int stage_id FK
        int domain_id FK
        string code
        string name
        string description
        int display_order
        string icon
        string color
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    topics {
        int id PK
        int subject_id FK
        string code
        string name
        string description
        int display_order
        int estimated_duration_minutes
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    learning_objectives {
        int id PK
        int topic_id FK
        string code
        string description
        int display_order
        boolean is_assessable
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    lessons {
        int id PK
        int topic_id FK
        string code
        enum status
        int version
        int estimated_duration_minutes
        string thumbnail_url
        string instructions
        int display_order
        datetime published_at
        int published_by FK
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    lesson_translations {
        int id PK
        int lesson_id FK
        string language
        string title
        string description
        string instructions
        string audio_url
        datetime created_at
        datetime updated_at
    }

    lesson_objectives {
        int lesson_id FK PK
        int objective_id FK PK
        int display_order
        datetime created_at
        datetime updated_at
    }

    activities {
        int id PK
        int lesson_id FK
        enum type
        string code
        enum status
        int version
        int display_order
        int estimated_duration_minutes
        string instructions
        json configuration
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    activity_translations {
        int id PK
        int activity_id FK
        string language
        string title
        string instructions
        string audio_url
        datetime created_at
        datetime updated_at
    }

    questions {
        int id PK
        int activity_id FK
        string question_type
        string prompt
        string prompt_audio_url
        int display_order
        int points
        json configuration
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    question_translations {
        int id PK
        int question_id FK
        string language
        string prompt
        string prompt_audio_url
        datetime created_at
        datetime updated_at
    }

    answer_options {
        int id PK
        int question_id FK
        string text
        string text_audio_url
        string image_url
        boolean is_correct
        int display_order
        string feedback_correct
        string feedback_incorrect
        json configuration
        datetime created_at
        datetime updated_at
    }

    answer_option_translations {
        int id PK
        int answer_option_id FK
        string language
        string text
        string feedback_correct
        string feedback_incorrect
        datetime created_at
        datetime updated_at
    }

    %% Progress & Engagement
    student_enrollments {
        int id PK
        int student_id FK
        int stage_id FK
        int subject_id FK
        enum status
        datetime enrolled_at
        datetime completed_at
        int assigned_by FK
        string notes
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    student_lesson_progress {
        int id PK
        int student_id FK
        int lesson_id FK
        enum status
        datetime started_at
        datetime completed_at
        datetime last_activity_at
        int time_spent_seconds
        int current_activity_id FK
        int completion_percentage
        datetime created_at
        datetime updated_at
    }

    activity_attempts {
        int id PK
        int student_id FK
        int activity_id FK
        int lesson_progress_id FK
        int attempt_number
        enum status
        datetime started_at
        datetime completed_at
        int time_spent_seconds
        int score
        int max_score
        boolean passed
        json metadata
        datetime created_at
        datetime updated_at
    }

    activity_responses {
        int id PK
        int attempt_id FK
        int question_id FK
        json selected_option_ids
        boolean is_correct
        int points_earned
        int time_spent_seconds
        json metadata
        datetime created_at
        datetime updated_at
    }

    student_rewards {
        int id PK
        string code UK
        string name
        string description
        string reward_type
        string image_url
        json criteria
        int points_value
        int display_order
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    student_reward_awards {
        int id PK
        int student_id FK
        int reward_id FK
        int attempt_id FK
        datetime earned_at
        json metadata
        datetime created_at
        datetime updated_at
    }

    %% Media & System
    media_assets ||--o{ lesson_media : used_in
    media_assets ||--o{ activity_media : used_in

    media_assets {
        int id PK
        string file_name
        string original_name
        string file_path
        string file_url
        enum media_type
        string mime_type
        int file_size
        int width
        int height
        float duration_seconds
        string alt_text
        string caption
        string source
        string license
        string attribution
        string language
        json tags
        int uploaded_by FK
        boolean is_processed
        string processing_error
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    lesson_media {
        int id PK
        int lesson_id FK
        int media_asset_id FK
        string media_role
        int display_order
        datetime created_at
        datetime updated_at
    }

    activity_media {
        int id PK
        int activity_id FK
        int media_asset_id FK
        string media_role
        int question_id FK
        int answer_option_id FK
        int display_order
        datetime created_at
        datetime updated_at
    }

    parent_notifications {
        int id PK
        int parent_id FK
        int student_id FK
        enum notification_type
        string title
        string message
        json data
        boolean is_read
        datetime read_at
        boolean sent_via_email
        boolean sent_via_sms
        datetime created_at
        datetime updated_at
    }

    audit_logs {
        int id PK
        datetime created_at
        int user_id FK
        enum action
        string resource_type
        string resource_id
        string resource_name
        json old_values
        json new_values
        string ip_address
        string user_agent
        string correlation_id
        boolean success
        string error_message
    }

    user_preferences {
        int id PK
        int user_id FK UK
        string preferred_language
        boolean audio_enabled
        float audio_volume
        float narration_speed
        boolean reduced_motion
        boolean high_contrast
        string font_size
        boolean screen_reader_optimized
        boolean email_notifications
        boolean sms_notifications
        boolean in_app_notifications
        boolean weekly_summary_email
        boolean progress_alerts
        boolean analytics_opt_in
        boolean data_sharing_consent
        datetime created_at
        datetime updated_at
    }
```

## Table Descriptions

### Users & Authentication
| Table | Purpose |
|-------|---------|
| `users` | Core user accounts for all roles |
| `roles` | Role definitions (admin, parent, student) |
| `user_roles` | Many-to-many mapping users to roles |
| `refresh_tokens` | JWT refresh token store for revocation |
| `password_resets` | Password reset tokens |

### Profiles & Relationships
| Table | Purpose |
|-------|---------|
| `parent_profiles` | Parent/guardian details |
| `student_profiles` | Child profiles (minimal PII) |
| `parent_student_relationships` | Parent-child links with permissions |
| `consent_records` | Privacy consent tracking |
| `data_deletion_requests` | GDPR/DPDP deletion requests |

### Curriculum (Hierarchical)
| Table | Purpose |
|-------|---------|
| `learning_stages` | Playgroup, Nursery, LKG, UKG |
| `learning_domains` | Language, Math, Physical, etc. |
| `subjects` | English, Hindi, Mathematics, EVS, etc. |
| `topics` | Specific topics within subjects |
| `learning_objectives` | Measurable learning goals |
| `lessons` | Learning units with activities |
| `lesson_translations` | Multilingual lesson content |
| `activities` | Interactive activities |
| `activity_translations` | Multilingual activity content |
| `questions` | Quiz/assessment questions |
| `question_translations` | Multilingual questions |
| `answer_options` | Answer choices |
| `answer_option_translations` | Multilingual answers |

### Progress & Engagement
| Table | Purpose |
|-------|---------|
| `student_enrollments` | Student stage/subject assignments |
| `student_lesson_progress` | Lesson completion tracking |
| `activity_attempts` | Activity attempt records |
| `activity_responses` | Individual question responses |
| `student_rewards` | Reward definitions |
| `student_reward_awards` | Earned rewards |

### Media & System
| Table | Purpose |
|-------|---------|
| `media_assets` | Images, audio, video files |
| `lesson_media` | Lesson-media associations |
| `activity_media` | Activity-media associations |
| `parent_notifications` | In-app notifications |
| `audit_logs` | Admin action audit trail |
| `user_preferences` | User settings |