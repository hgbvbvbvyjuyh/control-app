import requests
import time

BASE_URL = "http://localhost:3002"
TIMEOUT = 30  # seconds


def test_post_api_failures_logs_new_failure_with_valid_auth_and_data():
    # Step 1: Check backend is running on port 3002 by hitting /api/health (auth disabled)
    health_url = f"http://localhost:3002/api/health"
    try:
        health_resp = requests.get(health_url, timeout=TIMEOUT)
        assert health_resp.status_code == 200, f"Health check status code unexpected: {health_resp.status_code}"
        health_json = health_resp.json()
        assert health_json.get("status") == "ok", "Health check status not ok"
        assert isinstance(health_json.get("timestamp"), (int, float)), "Health check timestamp invalid"
    except Exception as e:
        raise AssertionError(f"Backend health check failed or backend not running on port 3002: {e}")

    url = f"{BASE_URL}/api/failures"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer valid_test_token"
    }

    # Valid body with title, optional sessionId, notes
    body = {
        "title": f"Test failure log {int(time.time()*1000)}",
        "notes": "This is a test failure note."
        # sessionId is optional, we omit it here
    }

    resp = None
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
    except Exception as e:
        raise AssertionError(f"POST /api/failures request failed: {e}")

    # Validate response
    assert resp.status_code == 201, f"Expected status 201, got {resp.status_code}"
    try:
        resp_json = resp.json()
    except Exception as e:
        raise AssertionError(f"Response is not valid JSON: {e}")

    # Validate returned failure object contains required fields
    assert "id" in resp_json, "Response missing 'id'"
    assert resp_json.get("title") == body["title"], "Title in response does not match request"
    # sessionId is optional - if present, it should be null or str
    if "sessionId" in resp_json:
        assert resp_json["sessionId"] is None or isinstance(resp_json["sessionId"], str), "sessionId is not valid"
    assert resp_json.get("notes") == body["notes"], "Notes in response do not match request"
    # createdAt should be a string timestamp
    created_at = resp_json.get("createdAt")
    assert created_at is not None, "createdAt missing in response"
    assert isinstance(created_at, str), "createdAt should be a string timestamp"


test_post_api_failures_logs_new_failure_with_valid_auth_and_data()