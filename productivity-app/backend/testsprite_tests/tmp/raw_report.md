
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** backend
- **Date:** 2026-04-11
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get api health returns status ok and timestamp
- **Test Code:** [TC001_get_api_health_returns_status_ok_and_timestamp.py](./TC001_get_api_health_returns_status_ok_and_timestamp.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/54d606f4-1b54-47f9-b676-14375d8d86eb
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post api frameworks creates new framework with valid auth
- **Test Code:** [TC002_post_api_frameworks_creates_new_framework_with_valid_auth.py](./TC002_post_api_frameworks_creates_new_framework_with_valid_auth.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/a1e366c6-0ea7-45a9-a4b6-c563d51e405f
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 get api frameworks lists active frameworks with auth
- **Test Code:** [TC003_get_api_frameworks_lists_active_frameworks_with_auth.py](./TC003_get_api_frameworks_lists_active_frameworks_with_auth.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 36, in test_get_api_frameworks_lists_active_frameworks_with_auth
AssertionError

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 41, in <module>
  File "<string>", line 38, in test_get_api_frameworks_lists_active_frameworks_with_auth
AssertionError: Response is not a valid JSON array of frameworks: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/9493545a-dedb-4ba7-8282-3d6ad1aa786c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 post api goals creates new goal with valid auth and data
- **Test Code:** [TC004_post_api_goals_creates_new_goal_with_valid_auth_and_data.py](./TC004_post_api_goals_creates_new_goal_with_valid_auth_and_data.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 38, in test_post_api_goals_creates_new_goal_with_valid_auth_and_data
AssertionError: Framework creation failed with status 400

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 79, in <module>
  File "<string>", line 43, in test_post_api_goals_creates_new_goal_with_valid_auth_and_data
AssertionError: Framework creation step failed: Framework creation failed with status 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/f8f109b8-3c09-4d97-87f1-d4275d11e3c4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 get api goals lists filtered goals with auth
- **Test Code:** [TC005_get_api_goals_lists_filtered_goals_with_auth.py](./TC005_get_api_goals_lists_filtered_goals_with_auth.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 30, in <module>
  File "<string>", line 19, in test_get_api_goals_lists_filtered_goals_with_auth
AssertionError: Expected 401 Unauthorized, got 200

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/96cfeeac-1d74-4d7d-a0a5-5fe844a6c1c5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 post api sessions starts new focus session enforcing single active session
- **Test Code:** [TC006_post_api_sessions_starts_new_focus_session_enforcing_single_active_session.py](./TC006_post_api_sessions_starts_new_focus_session_enforcing_single_active_session.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 54, in <module>
  File "<string>", line 22, in test_post_api_sessions_enforce_single_active_session
AssertionError: Expected 201 creating goal but got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/3126033f-3096-4e99-a9f3-356589166324
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 post api sessions id end ends active session with outcome logging
- **Test Code:** [TC007_post_api_sessions_id_end_ends_active_session_with_outcome_logging.py](./TC007_post_api_sessions_id_end_ends_active_session_with_outcome_logging.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 131, in <module>
  File "<string>", line 108, in test_post_api_sessions_id_end
AssertionError

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/87a0a243-5282-4459-8c51-09cdbd075a70
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 post api journals creates journal entry with valid auth and data
- **Test Code:** [TC008_post_api_journals_creates_journal_entry_with_valid_auth_and_data.py](./TC008_post_api_journals_creates_journal_entry_with_valid_auth_and_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 31, in <module>
  File "<string>", line 20, in test_post_api_journals_creates_journal_entry_with_valid_auth_and_data
AssertionError: Expected status 201 but got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/1891cfaa-9a72-4703-a1a5-8428acb2df8b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 post api failures logs new failure with valid auth and data
- **Test Code:** [TC009_post_api_failures_logs_new_failure_with_valid_auth_and_data.py](./TC009_post_api_failures_logs_new_failure_with_valid_auth_and_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 59, in <module>
  File "<string>", line 40, in test_post_api_failures_logs_new_failure_with_valid_auth_and_data
AssertionError: Expected status 201, got 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/25ac9363-0f8c-447e-9ece-e60aa5d8dd47
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 post api trash restore restores deleted item with valid auth and id
- **Test Code:** [TC010_post_api_trash_restore_restores_deleted_item_with_valid_auth_and_id.py](./TC010_post_api_trash_restore_restores_deleted_item_with_valid_auth_and_id.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 84, in <module>
  File "<string>", line 31, in test_post_api_trash_restore_restores_deleted_item
AssertionError: Framework creation failed: {"error":"name and keys are required"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d9c71854-e97d-4b42-bf34-256cc968c3f4/e4a5bebe-4dc1-4a07-b58c-f08d413c8920
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **20.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---