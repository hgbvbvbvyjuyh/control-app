import requests
import time

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Placeholder for valid Firebase ID token
AUTH_TOKEN = "Bearer valid_dummy_token"


def test_post_api_sessions_id_end():
    # Verify backend is running on port 3002 by checking /api/health
    try:
        health_resp = requests.get(f"http://localhost:3002/api/health", timeout=TIMEOUT)
        assert health_resp.status_code == 200
        health_json = health_resp.json()
        assert health_json.get("status") == "ok"
        assert isinstance(health_json.get("timestamp"), (int, float))
    except (requests.RequestException, AssertionError):
        # If backend on port 3002 is not running, skip test
        raise RuntimeError("Backend on port 3002 is not running; cannot proceed with test.")

    headers = {"Content-Type": "application/json", "Authorization": AUTH_TOKEN}

    # Helper functions to create and delete a session resource
    def create_goal():
        # Try to get existing goals with auth
        try:
            resp = requests.get(f"{BASE_URL}/api/goals", headers={"Authorization": AUTH_TOKEN}, timeout=TIMEOUT)
            if resp.status_code == 200:
                goals = resp.json()
                if isinstance(goals, list) and goals:
                    return goals[0]["id"]
        except Exception:
            pass

        # Get a valid frameworkId by getting frameworks
        framework_id = None
        try:
            resp_fw = requests.get(f"{BASE_URL}/api/frameworks", headers={"Authorization": AUTH_TOKEN}, timeout=TIMEOUT)
            if resp_fw.status_code == 200:
                frameworks = resp_fw.json()
                if isinstance(frameworks, list) and frameworks:
                    framework_id = frameworks[0].get("id")
        except Exception:
            pass

        if framework_id is None:
            raise AssertionError("Cannot find a valid frameworkId to create goal.")

        goal_data = {
            "title": "Test Goal for Session",
            "period": "day",
            "category": "Test",
            "frameworkId": framework_id
        }

        resp = requests.post(
            f"{BASE_URL}/api/goals",
            json=goal_data,
            headers=headers,
            timeout=TIMEOUT,
        )
        if resp.status_code == 201:
            return resp.json().get("id")
        raise AssertionError("Cannot create or find a goal for session creation.")

    def create_session(goal_id):
        session_data = {
            "goalId": goal_id,
            "durationMinutes": 1,
            "type": "focus",
        }
        resp = requests.post(
            f"{BASE_URL}/api/sessions",
            json=session_data,
            headers=headers,
            timeout=TIMEOUT,
        )
        if resp.status_code == 201:
            return resp.json().get("id")
        raise AssertionError(f"Failed to create session: Status {resp.status_code}")

    # No explicit delete endpoint for session

    # Create a goalId to link the session to
    goal_id = create_goal()

    active_session_id = None
    try:
        # Create active session
        active_session_id = create_session(goal_id)
        assert active_session_id is not None

        # Prepare payload to end session
        end_payload = {
            "achieved": True,
            "mistakes": ["minor distraction"],
            "improvements": ["take breaks"],
        }
        # End the active session - should succeed with 200 and session summary in response
        resp_end = requests.post(
            f"{BASE_URL}/api/sessions/{active_session_id}/end",
            json=end_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert resp_end.status_code == 200
        data = resp_end.json()
        # Validate expected response keys and types
        assert data.get("id") == active_session_id
        assert isinstance(data.get("duration"), (int, float))
        assert isinstance(data.get("achieved"), bool)
        assert "metrics" in data and isinstance(data["metrics"], dict)

        # Test 404 on non-existent session id
        non_existent_id = "nonexistent-session-id-123456"
        resp_404 = requests.post(
            f"{BASE_URL}/api/sessions/{non_existent_id}/end",
            json=end_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert resp_404.status_code == 404

    finally:
        # Cleanup: no explicit delete endpoint
        pass


test_post_api_sessions_id_end()