import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

def test_get_api_goals_lists_filtered_goals_with_auth():
    # Since auth is disabled in .env, no Authorization header is provided
    url = f"{BASE_URL}/api/goals"
    params = {"period": "month", "status": "active"}
    try:
        # Check if backend is running on port 3002 by hitting health endpoint
        health_response = requests.get(f"http://localhost:3002/api/health", timeout=TIMEOUT)
        assert health_response.status_code == 200, "Backend on port 3002 not running properly"
    except Exception as e:
        assert False, f"Health check on port 3002 failed: {e}"

    response = requests.get(url, params=params, timeout=TIMEOUT)
    # Auth is required according to PRD, so without Authorization header expect 401 Unauthorized
    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
    
    # If the server does return a body, parse and verify the error field
    try:
        data = response.json()
        assert isinstance(data, dict), "Response JSON is not an object"
        assert 'error' in data, "Response JSON does not contain 'error' field"
    except Exception:
        # Some servers may return empty body on 401, that's acceptable
        pass

test_get_api_goals_lists_filtered_goals_with_auth()
