"""CyberShield backend API tests - auth, labs, metrics, analytics, payments."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = None


def _load_base_url():
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if not url:
        with open("/app/frontend/.env", "r") as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    return url.rstrip("/")


BASE_URL = _load_base_url()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "operational"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class TestAuth:
    def test_register_returns_token_and_user(self, api_client):
        email = f"TEST_register_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "Passw0rd!", "full_name": "Test User"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body and body["access_token"]
        assert body["user"]["email"] == email
        assert body["user"]["tier"] == "student"
        assert body["user"]["is_admin"] is False

        # /auth/me should work with this token
        headers = {"Authorization": f"Bearer {body['access_token']}"}
        me = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=15)
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_login_student_success(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "student@cybershield.io", "password": "Student@123"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["access_token"]
        assert body["user"]["tier"] == "student"

    def test_login_admin_success(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@cybershield.io", "password": "Admin@123"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["is_admin"] is True
        assert body["user"]["tier"] == "professional"

    def test_login_wrong_password(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "student@cybershield.io", "password": "wrongPass"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_me_requires_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, api_client, student_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=student_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == "student@cybershield.io"

    def test_biometric_toggle(self, api_client, student_headers):
        # Enable
        r = api_client.post(
            f"{BASE_URL}/api/auth/biometric",
            headers=student_headers,
            json={"enabled": True},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["biometric_enabled"] is True

        # Verify via /auth/me
        me = api_client.get(f"{BASE_URL}/api/auth/me", headers=student_headers, timeout=15)
        assert me.json()["biometric_enabled"] is True

        # Disable for cleanup
        r2 = api_client.post(
            f"{BASE_URL}/api/auth/biometric",
            headers=student_headers,
            json={"enabled": False},
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json()["biometric_enabled"] is False


# ---------------------------------------------------------------------------
# Labs
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def labs_index(student_headers):
    r = requests.get(f"{BASE_URL}/api/labs", headers=student_headers, timeout=20)
    assert r.status_code == 200
    labs = r.json()["labs"]
    return {lab["slug"]: lab for lab in labs}


class TestLabs:
    def test_list_labs_has_six(self, api_client, student_headers):
        r = api_client.get(f"{BASE_URL}/api/labs", headers=student_headers, timeout=20)
        assert r.status_code == 200
        labs = r.json()["labs"]
        assert len(labs) == 6
        # Schema fields
        for lab in labs:
            assert "completed" in lab
            assert "instance" in lab
            assert "locked" in lab
            # flag_hash must be excluded
            assert "flag_hash" not in lab

    def test_pro_labs_locked_for_student(self, labs_index):
        # Student-tier labs unlocked
        assert labs_index["sql-injection-101"]["locked"] is False
        assert labs_index["xss-reflective"]["locked"] is False
        assert labs_index["outdated-apache"]["locked"] is False
        # Pro-tier labs locked
        assert labs_index["jwt-none-attack"]["locked"] is True
        assert labs_index["kerberoasting"]["locked"] is True
        assert labs_index["container-escape"]["locked"] is True

    def test_get_lab_detail_excludes_flag_hash(self, api_client, student_headers, labs_index):
        lab_id = labs_index["sql-injection-101"]["id"]
        r = api_client.get(f"{BASE_URL}/api/labs/{lab_id}", headers=student_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "flag_hash" not in body
        assert body["slug"] == "sql-injection-101"
        assert body["locked"] is False

    def test_start_lab_student_tier(self, api_client, student_headers, labs_index):
        lab_id = labs_index["sql-injection-101"]["id"]
        # ensure stopped first
        api_client.post(f"{BASE_URL}/api/labs/{lab_id}/stop", headers=student_headers, timeout=15)
        r = api_client.post(f"{BASE_URL}/api/labs/{lab_id}/start", headers=student_headers, timeout=20)
        assert r.status_code == 200
        inst = r.json()["instance"]
        assert inst["status"] == "running"
        assert inst["container_id"].startswith("cs_")
        assert inst["ip"].startswith("10.42.")
        assert isinstance(inst["port"], int)

    def test_start_pro_lab_as_student_forbidden(self, api_client, student_headers, labs_index):
        lab_id = labs_index["jwt-none-attack"]["id"]
        r = api_client.post(f"{BASE_URL}/api/labs/{lab_id}/start", headers=student_headers, timeout=15)
        assert r.status_code == 403
        assert "professional" in r.json()["detail"].lower()

    def test_stop_lab(self, api_client, student_headers, labs_index):
        lab_id = labs_index["sql-injection-101"]["id"]
        # ensure running
        api_client.post(f"{BASE_URL}/api/labs/{lab_id}/start", headers=student_headers, timeout=15)
        r = api_client.post(f"{BASE_URL}/api/labs/{lab_id}/stop", headers=student_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["stopped"] >= 1

    def test_reset_lab(self, api_client, student_headers, labs_index):
        lab_id = labs_index["xss-reflective"]["id"]
        r = api_client.post(f"{BASE_URL}/api/labs/{lab_id}/reset", headers=student_headers, timeout=15)
        assert r.status_code == 200
        inst = r.json()["instance"]
        assert inst["status"] == "running"

    def test_submit_correct_flag(self, api_client, student_headers, labs_index):
        lab_id = labs_index["sql-injection-101"]["id"]
        r = api_client.post(
            f"{BASE_URL}/api/labs/submit-flag",
            headers=student_headers,
            json={"lab_id": lab_id, "flag": "CSHIELD{union_select_is_king}"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["correct"] is True
        assert body["points"] == 100

    def test_submit_wrong_flag(self, api_client, student_headers, labs_index):
        lab_id = labs_index["sql-injection-101"]["id"]
        r = api_client.post(
            f"{BASE_URL}/api/labs/submit-flag",
            headers=student_headers,
            json={"lab_id": lab_id, "flag": "CSHIELD{nope}"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["correct"] is False
        assert body["points"] == 0


# ---------------------------------------------------------------------------
# Metrics & Analytics
# ---------------------------------------------------------------------------
class TestMetrics:
    def test_server_metrics(self, api_client, student_headers):
        r = api_client.get(f"{BASE_URL}/api/metrics/server", headers=student_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        for key in ("cpu_percent", "ram_percent", "network_in_kbps", "network_out_kbps",
                    "running_containers", "total_users", "history"):
            assert key in body, f"Missing key: {key}"
        assert isinstance(body["history"], list)
        assert len(body["history"]) == 30
        for pt in body["history"]:
            assert "t" in pt and "cpu" in pt and "ram" in pt


class TestAnalytics:
    def test_analytics_structure(self, api_client, student_headers):
        r = api_client.get(f"{BASE_URL}/api/analytics", headers=student_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "totals" in body and "labs" in body and "leaderboard" in body
        assert isinstance(body["labs"], list)
        for row in body["labs"]:
            for k in ("starts", "attempts", "successes", "success_rate"):
                assert k in row


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------
class TestPayments:
    def test_packages(self, api_client, student_headers):
        r = api_client.get(f"{BASE_URL}/api/payments/packages", headers=student_headers, timeout=15)
        assert r.status_code == 200
        pkgs = r.json()["packages"]
        ids = {p["id"]: p for p in pkgs}
        assert "professional_monthly" in ids
        assert "professional_annual" in ids
        assert ids["professional_monthly"]["amount"] == 9.99
        assert ids["professional_annual"]["amount"] == 99.00

    def test_checkout_creates_session(self, api_client, student_headers):
        r = api_client.post(
            f"{BASE_URL}/api/payments/checkout",
            headers=student_headers,
            json={"package_id": "professional_monthly", "origin_url": BASE_URL},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and body["url"].startswith("http")
        assert "session_id" in body and body["session_id"]
        # store for next test
        pytest.checkout_session_id = body["session_id"]

    def test_checkout_unknown_package_400(self, api_client, student_headers):
        r = api_client.post(
            f"{BASE_URL}/api/payments/checkout",
            headers=student_headers,
            json={"package_id": "free_trial_bogus", "origin_url": BASE_URL},
            timeout=15,
        )
        assert r.status_code == 400

    def test_payment_status_does_not_crash(self, api_client, student_headers):
        sid = getattr(pytest, "checkout_session_id", None)
        if not sid:
            pytest.skip("No session_id from previous test")
        r = api_client.get(
            f"{BASE_URL}/api/payments/status/{sid}",
            headers=student_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["session_id"] == sid
        assert "payment_status" in body
        assert "status" in body


# ---------------------------------------------------------------------------
# Auth enforcement on protected endpoints
# ---------------------------------------------------------------------------
class TestAuthEnforcement:
    @pytest.mark.parametrize("path,method", [
        ("/api/auth/me", "GET"),
        ("/api/labs", "GET"),
        ("/api/metrics/server", "GET"),
        ("/api/analytics", "GET"),
        ("/api/payments/packages", "GET"),
    ])
    def test_protected_endpoints_reject_anon(self, api_client, path, method):
        r = api_client.request(method, f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 401, f"{path} returned {r.status_code}"
