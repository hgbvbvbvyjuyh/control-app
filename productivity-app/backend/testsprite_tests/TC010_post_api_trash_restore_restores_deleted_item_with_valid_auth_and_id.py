import requests
import time

BASE_URL = "http://localhost:3002"
TIMEOUT = 30


def test_post_api_trash_restore_restores_deleted_item():
    # Verify backend is running on port 3002 by checking health endpoint
    health_url = f"http://localhost:3002/api/health"
    try:
        health_resp = requests.get(health_url, timeout=TIMEOUT)
        assert health_resp.status_code == 200, f"Backend health check failed with status {health_resp.status_code}"
        health_data = health_resp.json()
        assert health_data.get("status") == "ok"
        assert isinstance(health_data.get("timestamp"), (int, float))
    except Exception as e:
        raise AssertionError(f"Backend health check failed or backend not running on port 3002: {e}")

    # Step 1: Create a resource to delete, so we have a valid deleted item id
    # Since auth is disabled, no token required.
    # We'll create a framework, then delete it to move it to trash.

    # Create a new framework
    create_fw_url = f"{BASE_URL}/api/frameworks"
    fw_payload = {
        "name": f"Test Framework {int(time.time())}",
        "schema": {"fields": {"exampleField": {"type": "string"}}}
    }
    create_fw_resp = requests.post(create_fw_url, json=fw_payload, timeout=TIMEOUT)
    assert create_fw_resp.status_code == 201, f"Framework creation failed: {create_fw_resp.text}"
    created_fw = create_fw_resp.json()
    fw_id = created_fw.get("id")
    assert fw_id, "Created framework missing id"

    try:
        # Delete the framework (assuming delete moves it to trash)
        delete_url = f"{BASE_URL}/api/frameworks/{fw_id}"
        delete_resp = requests.delete(delete_url, timeout=TIMEOUT)
        assert delete_resp.status_code in (200, 204), f"Failed to delete framework: {delete_resp.status_code} {delete_resp.text}"

        # Get list of trash items to find the deleted framework id and type
        trash_url = f"{BASE_URL}/api/trash"
        trash_resp = requests.get(trash_url, timeout=TIMEOUT)
        assert trash_resp.status_code == 200, f"Fetching trash failed: {trash_resp.text}"
        trash_items = trash_resp.json()
        # Find our deleted framework in trash by id
        deleted_item = next((item for item in trash_items if item.get("id") == fw_id and item.get("type") == "framework"), None)
        assert deleted_item, f"Deleted framework id {fw_id} not found in trash"

        restored_url = f"{BASE_URL}/api/trash/restore"
        headers = {"Content-Type": "application/json"}

        # 1) Restore with valid deleted item id: expect 200 with restored item details
        restore_payload = {"id": fw_id}
        restore_resp = requests.post(restored_url, json=restore_payload, headers=headers, timeout=TIMEOUT)
        assert restore_resp.status_code == 200, f"Restore valid item failed: {restore_resp.status_code} {restore_resp.text}"
        restored_data = restore_resp.json()
        assert restored_data.get("id") == fw_id
        assert restored_data.get("type") == "framework"
        assert restored_data.get("status") == "restored"

        # Clean up: re-delete the restored framework to keep test environment consistent
        del_again_resp = requests.delete(delete_url, timeout=TIMEOUT)
        assert del_again_resp.status_code in (200, 204), f"Failed to delete restored framework: {del_again_resp.status_code} {del_again_resp.text}"

        # 2) Restore with non-existent id: expect 404 and error 'item_not_found'
        fake_id = "nonexistent-id-123456"
        restore_fake_payload = {"id": fake_id}
        restore_fake_resp = requests.post(restored_url, json=restore_fake_payload, headers=headers, timeout=TIMEOUT)
        assert restore_fake_resp.status_code == 404, f"Restoring non-existent id did not return 404: {restore_fake_resp.status_code}"
        error_data = restore_fake_resp.json()
        assert error_data.get("error") == "item_not_found"

    finally:
        # Cleanup: ensure created framework is deleted (in case restore failed and we didn't delete)
        # Try deleting existing framework id just in case
        try:
            requests.delete(f"{BASE_URL}/api/frameworks/{fw_id}", timeout=TIMEOUT)
        except Exception:
            pass


test_post_api_trash_restore_restores_deleted_item()
