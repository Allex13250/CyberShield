"""CyberShield - Cloud-Native Cybersecurity Training Platform Backend."""
import os
import uuid
import math
import random
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cybershield")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "cybershield-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_HOURS = 24 * 7

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
FRONTEND_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8081")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="CyberShield API")
api = APIRouter(prefix="/api")
auth_scheme = HTTPBearer(auto_error=False)


# -----------------------------------------------------------------------------
# Pricing tiers (fixed server-side to prevent client-side tampering)
# -----------------------------------------------------------------------------
TIER_PRICES = {
    "professional_monthly": {"amount": 9.99, "currency": "usd", "label": "Professional Monthly"},
    "professional_annual": {"amount": 99.00, "currency": "usd", "label": "Professional Annual"},
}


# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    tier: str
    is_admin: bool
    biometric_enabled: bool
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class BiometricToggle(BaseModel):
    enabled: bool


class Lab(BaseModel):
    id: str
    slug: str
    title: str
    category: str
    difficulty: str  # easy | medium | hard
    description: str
    long_description: str
    docker_image: str
    target_port: int
    flag_hash: str  # sha256 of the actual flag
    thumbnail: str
    tier_required: str  # student | professional
    points: int


class LabInstance(BaseModel):
    id: str
    user_id: str
    lab_id: str
    container_id: str  # simulated
    status: str  # provisioning | running | stopped | error
    ip: str
    port: int
    started_at: datetime
    expires_at: datetime
    completed: bool = False


class FlagSubmission(BaseModel):
    lab_id: str
    flag: str


class CheckoutRequest(BaseModel):
    package_id: str  # professional_monthly | professional_annual
    origin_url: str


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(user_id: str, email: str, tier: str, is_admin: bool) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "tier": tier,
        "is_admin": is_admin,
        "iat": now,
        "exp": now + timedelta(hours=JWT_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def to_public_user(u: dict) -> UserPublic:
    return UserPublic(
        id=u["id"],
        email=u["email"],
        full_name=u["full_name"],
        tier=u.get("tier", "student"),
        is_admin=u.get("is_admin", False),
        biometric_enabled=u.get("biometric_enabled", False),
        created_at=u["created_at"],
    )


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# -----------------------------------------------------------------------------
# Seed data
# -----------------------------------------------------------------------------
SEED_LABS = [
    {
        "slug": "sql-injection-101",
        "title": "SQL Injection 101",
        "category": "Web",
        "difficulty": "easy",
        "description": "Bypass a vulnerable login form to extract admin credentials.",
        "long_description": "A classic SQLi lab using a deliberately vulnerable PHP login endpoint. Use UNION-based attacks to enumerate the database schema and recover the admin flag.",
        "docker_image": "vulnerables/web-dvwa:latest",
        "target_port": 8080,
        "flag": "CSHIELD{union_select_is_king}",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/bab84aa9-5bbd-4317-baf4-40788a8ec1c6/images/067d2ead7e4e065842073b22c3dd9d02b040cb2ef44df8dfc996edcb3dc75546.png",
        "tier_required": "student",
        "points": 100,
    },
    {
        "slug": "xss-reflective",
        "title": "Reflective XSS",
        "category": "Web",
        "difficulty": "easy",
        "description": "Steal a session cookie from an unsanitized search endpoint.",
        "long_description": "A search endpoint reflects user input without escaping. Craft a payload that exfiltrates document.cookie to your listener and capture the flag.",
        "docker_image": "vulnerables/xss-lab:latest",
        "target_port": 3000,
        "flag": "CSHIELD{dom_is_a_weapon}",
        "thumbnail": "https://images.unsplash.com/photo-1592609930961-219235eded71?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHw0fHxoYWNrZXIlMjB0ZXJtaW5hbCUyMGNvZGV8ZW58MHx8fHwxNzc4NTc4MDc2fDA&ixlib=rb-4.1.0&q=85",
        "tier_required": "student",
        "points": 100,
    },
    {
        "slug": "outdated-apache",
        "title": "Outdated Apache RCE",
        "category": "Network",
        "difficulty": "medium",
        "description": "Exploit CVE-2021-41773 path traversal in Apache 2.4.49.",
        "long_description": "An exposed Apache 2.4.49 instance is vulnerable to path traversal. Chain it with mod_cgi to achieve remote code execution and grab the flag from /root/flag.txt.",
        "docker_image": "blueteamsteve/cve-2021-41773:latest",
        "target_port": 80,
        "flag": "CSHIELD{traversal_to_rce}",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/bab84aa9-5bbd-4317-baf4-40788a8ec1c6/images/0004a991947288b5b1dc4931af10e6269a874e6c1e11454ad7d93b1073c1554e.png",
        "tier_required": "student",
        "points": 200,
    },
    {
        "slug": "jwt-none-attack",
        "title": "JWT None Algorithm",
        "category": "API",
        "difficulty": "medium",
        "description": "Forge an admin JWT by abusing the 'none' algorithm.",
        "long_description": "The API trusts the alg header in JWTs. Switch the algorithm to 'none', strip the signature, and elevate to admin to retrieve the flag.",
        "docker_image": "cybershield/jwt-lab:latest",
        "target_port": 4000,
        "flag": "CSHIELD{alg_none_is_a_lie}",
        "thumbnail": "https://images.pexels.com/photos/207580/pexels-photo-207580.jpeg",
        "tier_required": "professional",
        "points": 300,
    },
    {
        "slug": "kerberoasting",
        "title": "Active Directory Kerberoasting",
        "category": "Active Directory",
        "difficulty": "hard",
        "description": "Request and crack a service ticket from a misconfigured SPN.",
        "long_description": "A simulated Windows domain has SPNs registered to weak service accounts. Request TGS tickets, crack them offline with hashcat, and submit the recovered cleartext password as the flag.",
        "docker_image": "cybershield/ad-lab:latest",
        "target_port": 88,
        "flag": "CSHIELD{kerberos_loves_rc4}",
        "thumbnail": "https://static.prod-images.emergentagent.com/jobs/bab84aa9-5bbd-4317-baf4-40788a8ec1c6/images/a36df35f73d085b422c0ce5ed19260c9f7f2938db3916ed30e74c4a3c72a08e4.png",
        "tier_required": "professional",
        "points": 500,
    },
    {
        "slug": "container-escape",
        "title": "Container Escape",
        "category": "Cloud",
        "difficulty": "hard",
        "description": "Break out of a privileged Docker container to read host secrets.",
        "long_description": "You are dropped into a privileged Linux container. Mount the host filesystem via /dev, pivot to the host namespace, and exfiltrate /host/etc/cybershield_flag.",
        "docker_image": "cybershield/escape-lab:latest",
        "target_port": 22,
        "flag": "CSHIELD{cgroup_release_agent}",
        "thumbnail": "https://images.pexels.com/photos/207580/pexels-photo-207580.jpeg",
        "tier_required": "professional",
        "points": 500,
    },
]


async def seed_db():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.labs.create_index("slug", unique=True)
    await db.lab_instances.create_index([("user_id", 1), ("lab_id", 1)])
    await db.submissions.create_index([("user_id", 1), ("lab_id", 1)])

    # Seed labs
    for entry in SEED_LABS:
        existing = await db.labs.find_one({"slug": entry["slug"]})
        if existing:
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "slug": entry["slug"],
            "title": entry["title"],
            "category": entry["category"],
            "difficulty": entry["difficulty"],
            "description": entry["description"],
            "long_description": entry["long_description"],
            "docker_image": entry["docker_image"],
            "target_port": entry["target_port"],
            "flag_hash": sha(entry["flag"]),
            "thumbnail": entry["thumbnail"],
            "tier_required": entry["tier_required"],
            "points": entry["points"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.labs.insert_one(doc)

    # Seed admin
    admin = await db.users.find_one({"email": "admin@cybershield.io"})
    if not admin:
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "email": "admin@cybershield.io",
            "full_name": "CyberShield Admin",
            "password_hash": hash_password("Admin@123"),
            "tier": "professional",
            "is_admin": True,
            "biometric_enabled": False,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user admin@cybershield.io / Admin@123")

    # Seed demo student
    demo = await db.users.find_one({"email": "student@cybershield.io"})
    if not demo:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "student@cybershield.io",
            "full_name": "Demo Student",
            "password_hash": hash_password("Student@123"),
            "tier": "student",
            "is_admin": False,
            "biometric_enabled": False,
            "created_at": datetime.now(timezone.utc),
        })


@app.on_event("startup")
async def on_startup():
    await seed_db()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "cybershield", "status": "operational"}


# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------
@api.post("/auth/register", response_model=AuthResponse)
async def register(body: UserRegister):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "tier": "student",
        "is_admin": False,
        "biometric_enabled": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    token = make_token(user_id, body.email, "student", False)
    return AuthResponse(access_token=token, user=to_public_user(doc))


@api.post("/auth/login", response_model=AuthResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(user["id"], user["email"], user.get("tier", "student"), user.get("is_admin", False))
    return AuthResponse(access_token=token, user=to_public_user(user))


@api.get("/auth/me", response_model=UserPublic)
async def me(user=Depends(current_user)):
    return to_public_user(user)


@api.post("/auth/biometric", response_model=UserPublic)
async def biometric_toggle(body: BiometricToggle, user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"biometric_enabled": body.enabled}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return to_public_user(updated)


# -----------------------------------------------------------------------------
# Labs
# -----------------------------------------------------------------------------
@api.get("/labs")
async def list_labs(user=Depends(current_user)):
    labs = await db.labs.find({}, {"_id": 0, "flag_hash": 0}).to_list(100)

    # Attach completion status per user
    completed_ids = set()
    async for sub in db.submissions.find({"user_id": user["id"], "correct": True}, {"_id": 0, "lab_id": 1}):
        completed_ids.add(sub["lab_id"])

    instances = {}
    async for inst in db.lab_instances.find({"user_id": user["id"], "status": "running"}, {"_id": 0}):
        instances[inst["lab_id"]] = inst

    out = []
    for lab in labs:
        inst = instances.get(lab["id"])
        out.append({
            **lab,
            "completed": lab["id"] in completed_ids,
            "instance": _serialize_instance(inst) if inst else None,
            "locked": lab["tier_required"] == "professional" and user.get("tier") != "professional" and not user.get("is_admin"),
        })
    # Sort by difficulty then points
    diff_order = {"easy": 0, "medium": 1, "hard": 2}
    out.sort(key=lambda x: (diff_order.get(x["difficulty"], 3), x["points"]))
    return {"labs": out}


@api.get("/labs/{lab_id}")
async def get_lab(lab_id: str, user=Depends(current_user)):
    lab = await db.labs.find_one({"id": lab_id}, {"_id": 0, "flag_hash": 0})
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    inst = await db.lab_instances.find_one({"user_id": user["id"], "lab_id": lab_id, "status": {"$in": ["provisioning", "running"]}}, {"_id": 0})
    completed = await db.submissions.find_one({"user_id": user["id"], "lab_id": lab_id, "correct": True}, {"_id": 0})
    locked = lab["tier_required"] == "professional" and user.get("tier") != "professional" and not user.get("is_admin")
    return {**lab, "instance": _serialize_instance(inst) if inst else None, "completed": bool(completed), "locked": locked}


def _serialize_instance(inst: Optional[dict]) -> Optional[dict]:
    if not inst:
        return None
    return {
        "id": inst["id"],
        "lab_id": inst["lab_id"],
        "container_id": inst["container_id"],
        "status": inst["status"],
        "ip": inst["ip"],
        "port": inst["port"],
        "started_at": inst["started_at"].isoformat() if isinstance(inst["started_at"], datetime) else inst["started_at"],
        "expires_at": inst["expires_at"].isoformat() if isinstance(inst["expires_at"], datetime) else inst["expires_at"],
    }


@api.post("/labs/{lab_id}/start")
async def start_lab(lab_id: str, user=Depends(current_user)):
    lab = await db.labs.find_one({"id": lab_id})
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    if lab["tier_required"] == "professional" and user.get("tier") != "professional" and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Upgrade to Professional to access this lab")

    # If already running for this user+lab, return it
    existing = await db.lab_instances.find_one({"user_id": user["id"], "lab_id": lab_id, "status": {"$in": ["provisioning", "running"]}})
    if existing:
        return {"instance": _serialize_instance(existing)}

    now = datetime.now(timezone.utc)
    instance_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "lab_id": lab_id,
        "container_id": "cs_" + uuid.uuid4().hex[:12],
        "status": "running",  # simulated: instantly ready
        "ip": f"10.42.{random.randint(1,254)}.{random.randint(2,254)}",
        "port": lab["target_port"],
        "started_at": now,
        "expires_at": now + timedelta(hours=2),
        "completed": False,
    }
    await db.lab_instances.insert_one(instance_doc)
    return {"instance": _serialize_instance(instance_doc)}


@api.post("/labs/{lab_id}/stop")
async def stop_lab(lab_id: str, user=Depends(current_user)):
    res = await db.lab_instances.update_many(
        {"user_id": user["id"], "lab_id": lab_id, "status": {"$in": ["provisioning", "running"]}},
        {"$set": {"status": "stopped", "stopped_at": datetime.now(timezone.utc)}},
    )
    return {"stopped": res.modified_count}


@api.post("/labs/{lab_id}/reset")
async def reset_lab(lab_id: str, user=Depends(current_user)):
    # Stop then start
    await db.lab_instances.update_many(
        {"user_id": user["id"], "lab_id": lab_id, "status": {"$in": ["provisioning", "running"]}},
        {"$set": {"status": "stopped", "stopped_at": datetime.now(timezone.utc)}},
    )
    return await start_lab(lab_id, user)


@api.post("/labs/submit-flag")
async def submit_flag(body: FlagSubmission, user=Depends(current_user)):
    lab = await db.labs.find_one({"id": body.lab_id})
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    correct = sha(body.flag.strip()) == lab["flag_hash"]
    submission = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "lab_id": body.lab_id,
        "flag_submitted": body.flag.strip(),
        "correct": correct,
        "submitted_at": datetime.now(timezone.utc),
        "points_awarded": lab["points"] if correct else 0,
    }
    await db.submissions.insert_one(submission)
    if correct:
        await db.lab_instances.update_many(
            {"user_id": user["id"], "lab_id": body.lab_id},
            {"$set": {"completed": True}},
        )
    return {"correct": correct, "points": submission["points_awarded"], "lab_title": lab["title"]}


# -----------------------------------------------------------------------------
# Metrics (simulated) & Analytics
# -----------------------------------------------------------------------------
@api.get("/metrics/server")
async def server_metrics(user=Depends(current_user)):
    # Simulated, but stable-ish based on time
    now = datetime.now(timezone.utc)
    t = now.timestamp()
    cpu = 35 + 25 * math.sin(t / 11.0) + random.uniform(-3, 5)
    ram = 52 + 18 * math.cos(t / 17.0) + random.uniform(-2, 4)
    net_in = 120 + 90 * math.sin(t / 7.0) + random.uniform(-10, 30)
    net_out = 80 + 60 * math.cos(t / 9.0) + random.uniform(-10, 25)

    running = await db.lab_instances.count_documents({"status": "running"})
    total_users = await db.users.count_documents({})

    # 30 history points
    history = []
    for i in range(30):
        ti = t - (29 - i) * 5
        history.append({
            "t": int(ti),
            "cpu": max(2, min(98, 35 + 25 * math.sin(ti / 11.0) + random.uniform(-3, 5))),
            "ram": max(5, min(95, 52 + 18 * math.cos(ti / 17.0) + random.uniform(-2, 4))),
        })

    return {
        "cpu_percent": round(max(2, min(98, cpu)), 1),
        "ram_percent": round(max(5, min(95, ram)), 1),
        "network_in_kbps": round(max(0, net_in), 1),
        "network_out_kbps": round(max(0, net_out), 1),
        "running_containers": running,
        "total_users": total_users,
        "uptime_seconds": int(t % 1_000_000),
        "history": history,
    }


@api.get("/analytics")
async def analytics(user=Depends(current_user)):
    # Lab popularity (start count)
    pipeline = [
        {"$group": {"_id": "$lab_id", "starts": {"$sum": 1}}},
        {"$sort": {"starts": -1}},
        {"$limit": 10},
    ]
    starts_by_lab = {}
    async for row in db.lab_instances.aggregate(pipeline):
        starts_by_lab[row["_id"]] = row["starts"]

    # Success rates
    success_pipeline = [
        {"$group": {
            "_id": "$lab_id",
            "attempts": {"$sum": 1},
            "successes": {"$sum": {"$cond": ["$correct", 1, 0]}},
        }},
    ]
    success_by_lab = {}
    async for row in db.submissions.aggregate(success_pipeline):
        success_by_lab[row["_id"]] = {"attempts": row["attempts"], "successes": row["successes"]}

    labs = await db.labs.find({}, {"_id": 0, "flag_hash": 0}).to_list(100)
    rows = []
    for lab in labs:
        sb = success_by_lab.get(lab["id"], {"attempts": 0, "successes": 0})
        rate = (sb["successes"] / sb["attempts"] * 100) if sb["attempts"] else 0
        rows.append({
            "lab_id": lab["id"],
            "title": lab["title"],
            "category": lab["category"],
            "difficulty": lab["difficulty"],
            "starts": starts_by_lab.get(lab["id"], 0),
            "attempts": sb["attempts"],
            "successes": sb["successes"],
            "success_rate": round(rate, 1),
        })
    rows.sort(key=lambda r: (-r["starts"], -r["successes"]))

    totals = {
        "users": await db.users.count_documents({}),
        "labs": await db.labs.count_documents({}),
        "submissions": await db.submissions.count_documents({}),
        "successful_submissions": await db.submissions.count_documents({"correct": True}),
        "active_instances": await db.lab_instances.count_documents({"status": "running"}),
        "professional_users": await db.users.count_documents({"tier": "professional"}),
    }

    # Leaderboard
    leaderboard_pipeline = [
        {"$match": {"correct": True}},
        {"$group": {"_id": "$user_id", "points": {"$sum": "$points_awarded"}, "solves": {"$sum": 1}}},
        {"$sort": {"points": -1}},
        {"$limit": 10},
    ]
    leaderboard = []
    async for row in db.submissions.aggregate(leaderboard_pipeline):
        u = await db.users.find_one({"id": row["_id"]}, {"_id": 0, "full_name": 1, "email": 1, "tier": 1})
        if not u:
            continue
        leaderboard.append({
            "user_id": row["_id"],
            "full_name": u["full_name"],
            "tier": u["tier"],
            "points": row["points"],
            "solves": row["solves"],
        })

    return {"totals": totals, "labs": rows, "leaderboard": leaderboard}


# -----------------------------------------------------------------------------
# Stripe Payments
# -----------------------------------------------------------------------------
def get_stripe(request: Request) -> StripeCheckout:
    base = str(request.base_url).rstrip("/")
    webhook_url = f"{base}/api/payments/webhook"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api.get("/payments/packages")
async def list_packages(user=Depends(current_user)):
    return {"packages": [{"id": k, **v} for k, v in TIER_PRICES.items()]}


@api.post("/payments/checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user=Depends(current_user)):
    if body.package_id not in TIER_PRICES:
        raise HTTPException(status_code=400, detail="Unknown package")
    price = TIER_PRICES[body.package_id]

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/subscription"

    stripe = get_stripe(request)
    session_req = CheckoutSessionRequest(
        amount=price["amount"],
        currency=price["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "user_email": user["email"],
            "package_id": body.package_id,
        },
    )
    session = await stripe.create_checkout_session(session_req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "package_id": body.package_id,
        "amount": price["amount"],
        "currency": price["currency"],
        "payment_status": "pending",
        "status": "open",
        "metadata": {"user_id": user["id"], "package_id": body.package_id},
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    return {"url": session.url, "session_id": session.session_id}


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user=Depends(current_user)):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if record["user_id"] != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not your transaction")

    stripe = get_stripe(request)
    status_obj = await stripe.get_checkout_status(session_id)

    update = {
        "payment_status": status_obj.payment_status,
        "status": status_obj.status,
        "amount_total": status_obj.amount_total,
        "currency": status_obj.currency,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    # Upgrade tier once on first successful detection
    if status_obj.payment_status == "paid" and record.get("payment_status") != "paid":
        await db.users.update_one({"id": user["id"]}, {"$set": {"tier": "professional"}})

    user_after = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {
        "session_id": session_id,
        "payment_status": status_obj.payment_status,
        "status": status_obj.status,
        "amount_total": status_obj.amount_total,
        "currency": status_obj.currency,
        "user": to_public_user(user_after).dict(),
    }


@api.post("/payments/webhook")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    stripe = get_stripe(request)
    try:
        event = await stripe.handle_webhook(body, signature)
    except Exception as e:
        logger.warning("Webhook verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event.event_type in ("checkout.session.completed", "payment_intent.succeeded"):
        record = await db.payment_transactions.find_one({"session_id": event.session_id})
        if record and record.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": event.payment_status, "status": "complete", "updated_at": datetime.now(timezone.utc)}},
            )
            if record.get("user_id"):
                await db.users.update_one({"id": record["user_id"]}, {"$set": {"tier": "professional"}})

    return {"ok": True}


# -----------------------------------------------------------------------------
# Register router & CORS
# -----------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
