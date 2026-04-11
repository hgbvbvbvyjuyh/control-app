import requests
import time

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Placeholder valid token for test purposes
AUTH_HEADER = {"Authorization": "Bearer valid_token_placeholder"}

def test_post_api_sessions_enforce_single_active_session():
    sessions_url = f"{BASE_URL}/api/sessions"
    # Step 1: Create a new goal to associate the session with
    goals_url = f"{BASE_URL}/api/goals"
    goal_payload = {
        "title": f"Test Daily Goal {int(time.time()*1000)}",
        "period": "day",
        "category": "Test",
        "frameworkId": "dummy_framework_id"
    }
    try:
        create_goal_resp = requests.post(goals_url, json=goal_payload, headers=AUTH_HEADER, timeout=TIMEOUT)
        assert create_goal_resp.status_code == 201, f"Expected 201 creating goal but got {create_goal_resp.status_code}"
        goal = create_goal_resp.json()
        goal_id = goal.get("id")
        assert goal_id is not None, "Created goal does not have an id"

        session_payload = {
            "goalId": goal_id,
            "durationMinutes": 25,
            "type": "focus"
        }
        start_session_resp = requests.post(sessions_url, json=session_payload, headers=AUTH_HEADER, timeout=TIMEOUT)
        assert start_session_resp.status_code == 201, f"Expected 201 starting session but got {start_session_resp.status_code}"
        session1 = start_session_resp.json()
        session1_id = session1.get("id")
        assert session1_id is not None, "Started session does not have an id"
        assert session1.get("goalId") == goal_id, "Session goalId mismatch"
        assert session1.get("status") == "active", "Session status should be 'active'"

        start_session_resp2 = requests.post(sessions_url, json=session_payload, headers=AUTH_HEADER, timeout=TIMEOUT)
        assert start_session_resp2.status_code == 409, f"Expected 409 for second active session but got {start_session_resp2.status_code}"
        error_resp = start_session_resp2.json()
        assert error_resp.get("error") == "active_session_exists", "Expected 'active_session_exists' error"

    finally:
        if 'session1_id' in locals():
            end_url = f"{sessions_url}/{session1_id}/end"
            end_payload = {"achieved": False, "mistakes": [], "improvements": []}
            try:
                requests.post(end_url, json=end_payload, headers=AUTH_HEADER, timeout=TIMEOUT)
            except Exception:
                pass

test_post_api_sessions_enforce_single_active_session()
