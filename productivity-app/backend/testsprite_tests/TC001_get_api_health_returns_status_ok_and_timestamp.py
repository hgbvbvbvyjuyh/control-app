import requests
import time

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

def test_get_api_health_returns_status_ok_and_timestamp():
    # Verify API health endpoint returns status 'ok' and valid timestamp
    url_health = BASE_URL.rstrip('/') + "/api/health"
    try:
        response = requests.get(url_health, timeout=TIMEOUT)
        # Assert HTTP 200 OK
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
        json_data = response.json()
        # Assert JSON contains 'status' and 'timestamp'
        assert "status" in json_data, "'status' field missing in response"
        assert "timestamp" in json_data, "'timestamp' field missing in response"
        # Assert 'status' is 'ok'
        assert json_data["status"] == "ok", f"Expected status 'ok' but got {json_data['status']}"
        # Assert timestamp is a number and is in plausible epoch ms range (from year 2000 onwards)
        ts = json_data["timestamp"]
        assert isinstance(ts, (int, float)), f"Timestamp is not a number: {ts}"
        # Plausible range: after 2000-01-01 00:00:00 UTC (946684800000 ms) and before now+1h
        now_ms = time.time() * 1000
        lower_bound = 946684800000
        upper_bound = now_ms + 3600000
        assert lower_bound <= ts <= upper_bound, f"Timestamp {ts} not in plausible range"
    except requests.RequestException as e:
        assert False, f"Request to {url_health} failed: {e}"
    except ValueError as e:
        assert False, f"Response JSON decoding failed: {e}"

test_get_api_health_returns_status_ok_and_timestamp()