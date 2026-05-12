"""Tests for new iteration: PATCH /api/auth/me + per-lab attempts/progress in GET /api/labs."""
import os
import uuid
import pytest
import requests


def _get_base_url() -> str:
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if not url:
        with open("/app/frontend/.env", "r") as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    return url.rstrip("/")


BASE_URL = _get_base_url()


# ---------------------------------------------------------------------------
# Fresh user fixture - isolated state for attempts/progress assertions
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def fresh_user_headers():
    email = f"TEST_progress_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Progress Tester"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Feature 1: PATCH /api/auth/me
# ---------------------------------------------------------------------------
class TestPatchAuthMe:
    """PATCH /api/auth/me - profile name editing."""

    def test_patch_valid_full_name(self, fresh_user_headers):
        r = requests.patch(
            f"{BASE_URL}/api/auth/me",
            headers=fresh_user_headers,
            json={"full_name": "Brand New Name"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["full_name"] == "Brand New Name"
        # UserPublic shape preserved
        for k in ("id", "email", "tier", "is_admin", "biometric_enabled", "created_at"):
            assert k in body
        # Verify persistence via GET /auth/me
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=fresh_user_headers, timeout=15)
        assert me.status_code == 200
        assert me.json()["full_name"] == "Brand New Name"

    def test_patch_short_name_rejected(self, fresh_user_headers):
        r = requests.patch(
            f"{BASE_URL}/api/auth/me",
            headers=fresh_user_headers,
            json={"full_name": "X"},
            timeout=15,
        )
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "at least 2 characters" in detail.lower()

    def test_patch_empty_body_returns_user_unchanged(self, fresh_user_headers):
        # First get current name
        cur = requests.get(f"{BASE_URL}/api/auth/me", headers=fresh_user_headers, timeout=15).json()
        before_name = cur["full_name"]

        r = requests.patch(
            f"{BASE_URL}/api/auth/me",
            headers=fresh_user_headers,
            json={},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["full_name"] == before_name
        assert body["email"] == cur["email"]

    def test_patch_no_auth_returns_401(self):
        r = requests.patch(
            f"{BASE_URL}/api/auth/me",
            json={"full_name": "Anything"},
            timeout=15,
        )
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Feature 2: GET /api/labs returns attempts + progress
# ---------------------------------------------------------------------------
def _labs_by_slug(headers):
    r = requests.get(f"{BASE_URL}/api/labs", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    return {lab["slug"]: lab for lab in r.json()["labs"]}


class TestLabsAttemptsAndProgress:
    """GET /api/labs - new attempts (int >=0) & progress (0..1) fields."""

    def test_initial_state_zero_attempts_zero_progress(self, fresh_user_headers):
        labs = _labs_by_slug(fresh_user_headers)
        for slug, lab in labs.items():
            assert "attempts" in lab, f"{slug} missing 'attempts'"
            assert "progress" in lab, f"{slug} missing 'progress'"
            assert isinstance(lab["attempts"], int)
            assert lab["attempts"] >= 0
            assert isinstance(lab["progress"], (int, float))
            assert 0 <= lab["progress"] <= 1
            # fresh user => all zero
            assert lab["attempts"] == 0, f"{slug} attempts={lab['attempts']}"
            assert lab["progress"] == 0, f"{slug} progress={lab['progress']}"
            assert lab["completed"] is False

    def test_two_wrong_flags_yields_attempts_2_progress_067(self, fresh_user_headers):
        labs = _labs_by_slug(fresh_user_headers)
        sqli = labs["sql-injection-101"]
        lab_id = sqli["id"]

        # Submit 2 wrong flags
        for _ in range(2):
            r = requests.post(
                f"{BASE_URL}/api/labs/submit-flag",
                headers=fresh_user_headers,
                json={"lab_id": lab_id, "flag": "CSHIELD{definitely_wrong}"},
                timeout=15,
            )
            assert r.status_code == 200
            assert r.json()["correct"] is False

        labs_after = _labs_by_slug(fresh_user_headers)
        sqli_after = labs_after["sql-injection-101"]
        assert sqli_after["attempts"] == 2
        assert sqli_after["completed"] is False
        # Expected: min(2/3, 0.85) ≈ 0.67  (rounded to 2 dp by server)
        assert sqli_after["progress"] == pytest.approx(0.67, abs=0.01)

    def test_correct_flag_yields_progress_1_and_completed_true(self, fresh_user_headers):
        labs = _labs_by_slug(fresh_user_headers)
        sqli = labs["sql-injection-101"]
        lab_id = sqli["id"]

        r = requests.post(
            f"{BASE_URL}/api/labs/submit-flag",
            headers=fresh_user_headers,
            json={"lab_id": lab_id, "flag": "CSHIELD{union_select_is_king}"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["correct"] is True

        labs_after = _labs_by_slug(fresh_user_headers)
        sqli_after = labs_after["sql-injection-101"]
        assert sqli_after["completed"] is True
        assert sqli_after["progress"] == 1.0


# ---------------------------------------------------------------------------
# Cleanup: Restore seeded student's name to 'Demo Student'
# (in case existing test_cybershield_api.py ran first and modified it — defensive)
# ---------------------------------------------------------------------------
class TestSeededStudentNameCleanup:
    def test_restore_demo_student_name(self):
        # Login as seeded student
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "student@cybershield.io", "password": "Student@123"},
            timeout=15,
        )
        assert r.status_code == 200
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # PATCH back to "Demo Student"
        r = requests.patch(
            f"{BASE_URL}/api/auth/me",
            headers=headers,
            json={"full_name": "Demo Student"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["full_name"] == "Demo Student"
