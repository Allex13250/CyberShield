"""Shared fixtures for CyberShield backend tests."""
import os
import pytest
import requests


def _get_base_url() -> str:
    # Frontend .env exposes the public backend URL
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if not url:
        # Read from frontend env file as fallback
        try:
            with open("/app/frontend/.env", "r") as f:
                for line in f:
                    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except Exception:
            pass
    if not url:
        raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _get_base_url()


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def student_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "student@cybershield.io", "password": "Student@123"},
        timeout=30,
    )
    assert r.status_code == 200, f"Student login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@cybershield.io", "password": "Admin@123"},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
