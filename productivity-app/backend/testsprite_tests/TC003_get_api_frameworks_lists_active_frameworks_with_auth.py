import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Placeholder token for test; replace with a valid Firebase ID token
AUTH_TOKEN = "Bearer VALID_FIREBASE_ID_TOKEN"

def test_get_api_frameworks_lists_active_frameworks_with_auth():
    # Verify backend running on port 3002 by calling /api/health (auth disabled)
    health_url = f"http://localhost:3002/api/health"
    try:
        health_resp = requests.get(health_url, timeout=TIMEOUT)
        assert health_resp.status_code == 200, f"Backend health check failed with status {health_resp.status_code}"
        health_json = health_resp.json()
        assert health_json.get("status") == "ok"
        assert isinstance(health_json.get("timestamp"), int)
    except Exception as e:
        raise AssertionError(f"Backend on port 3002 is not running or /api/health failed: {e}")

    url = f"{BASE_URL}/api/frameworks"
    headers = {"Authorization": AUTH_TOKEN}
    try:
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")

    assert resp.status_code == 200, f"Expected status 200 but got {resp.status_code}"

    try:
        data = resp.json()
        assert isinstance(data, list), "Response is not an array"
        for fw in data:
            assert isinstance(fw, dict), "Framework list item is not an object"
            # At minimum expect id, name, schema keys
            assert "id" in fw and "name" in fw and "schema" in fw
    except Exception as e:
        raise AssertionError(f"Response is not a valid JSON array of frameworks: {e}")


test_get_api_frameworks_lists_active_frameworks_with_auth()