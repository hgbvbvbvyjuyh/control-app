import requests
import time

BASE_URL = "http://localhost:3002"
TIMEOUT = 30

# Placeholder token for testing; replace with a valid token if needed
AUTH_TOKEN = "Bearer valid_firebase_id_token"

headers = {"Authorization": AUTH_TOKEN}

def test_post_api_goals_creates_new_goal_with_valid_auth_and_data():
    # Verify backend running on port 3002 by checking /api/health
    health_url = f"{BASE_URL}/api/health"
    try:
        health_resp = requests.get(health_url, timeout=TIMEOUT)
        assert health_resp.status_code == 200, f"Health check failed with status code {health_resp.status_code}"
        health_data = health_resp.json()
        assert health_data.get("status") == "ok", "Health check status not ok"
        assert isinstance(health_data.get("timestamp"), (int, float)), "Health check timestamp missing or invalid"
    except Exception as e:
        raise AssertionError(f"Backend health check failed: {e}")

    # Step 1: Create a new goal framework (required for goal creation)
    frameworks_url = f"{BASE_URL}/api/frameworks"
    framework_payload = {
        "name": "Test Framework for Goal",
        "schema": {
            "type": "object",
            "properties": {
                "exampleProperty": {"type": "string"}
            }
        }
    }

    try:
        resp_framework = requests.post(frameworks_url, json=framework_payload, headers=headers, timeout=TIMEOUT)
        assert resp_framework.status_code == 201, f"Framework creation failed with status {resp_framework.status_code}"
        framework = resp_framework.json()
        framework_id = framework.get("id")
        assert framework_id is not None, "Created framework missing id"
    except Exception as e:
        raise AssertionError(f"Framework creation step failed: {e}")

    # Step 2: Create a new hierarchical goal under this framework
    goals_url = f"{BASE_URL}/api/goals"
    goal_payload = {
        "title": "Save $10,000",
        "period": "year",
        "category": "Finance",
        "frameworkId": framework_id
    }

    created_goal_id = None
    try:
        resp_goal = requests.post(goals_url, json=goal_payload, headers=headers, timeout=TIMEOUT)
        assert resp_goal.status_code == 201, f"Goal creation failed with status {resp_goal.status_code}"
        goal = resp_goal.json()
        created_goal_id = goal.get("id")
        assert created_goal_id is not None, "Created goal missing id"
        assert goal.get("title") == goal_payload["title"], "Goal title mismatch"
        assert goal.get("period") == goal_payload["period"], "Goal period mismatch"
        assert "status" in goal, "Goal status missing"
        assert "parentId" in goal, "Goal parentId missing"
    finally:
        # Cleanup: delete created goal if exists
        if created_goal_id:
            try:
                requests.delete(f"{goals_url}/{created_goal_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass
        # Cleanup: delete created framework if exists
        if framework_id:
            try:
                requests.delete(f"{frameworks_url}/{framework_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass

test_post_api_goals_creates_new_goal_with_valid_auth_and_data()