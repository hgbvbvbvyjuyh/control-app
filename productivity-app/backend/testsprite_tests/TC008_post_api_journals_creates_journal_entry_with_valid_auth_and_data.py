import requests

def test_post_api_journals_creates_journal_entry_with_valid_auth_and_data():
    base_url = "http://localhost:5174"
    url = f"{base_url}/api/journals"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer valid_token_placeholder"
    }

    payload = {
        "scope": "weekly",
        "title": "Weekly Reflection",
        "content": "This week was productive and focused on testing.",
        "goalId": None
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 201, f"Expected status 201 but got {response.status_code}"
        data = response.json()
        # Validate returned fields
        assert isinstance(data.get("id"), (str, int)), "Response missing valid 'id'"
        assert data.get("scope") == payload["scope"], f"Expected scope '{payload['scope']}' but got '{data.get('scope')}'"
        assert data.get("title") == payload["title"], f"Expected title '{payload['title']}' but got '{data.get('title')}'"
        assert data.get("content") == payload["content"], f"Expected content '{payload['content']}' but got '{data.get('content')}'"
        assert isinstance(data.get("createdAt"), str), "Response missing valid 'createdAt'"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_journals_creates_journal_entry_with_valid_auth_and_data()