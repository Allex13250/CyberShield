# CyberShield - Product Requirements Document

## Overview
CyberShield is a cloud-native mobile training platform for hands-on cybersecurity education. Built as an Expo React Native mobile app backed by a FastAPI orchestrator and MongoDB, it lets operators deploy isolated vulnerable lab environments, capture flags (CTF-style), monitor server telemetry in real time, and upgrade to a Professional tier via Stripe.

## Stack
- Frontend: Expo SDK 54, expo-router file-based routing, react-native-svg, expo-secure-store, expo-local-authentication, expo-web-browser, axios.
- Backend: FastAPI (Python), Motor (async MongoDB), bcrypt + PyJWT, emergentintegrations Stripe Checkout.
- Database: MongoDB (collections: users, labs, lab_instances, submissions, payment_transactions).
- Theme: "DevSecOps tactical hacker" dark + neon green/cyan monospace aesthetic per design guidelines.

## Core Features
- **Auth**: JWT email/password register & login; bcrypt-hashed passwords; biometric (FaceID/TouchID) optional unlock via expo-local-authentication.
- **Lab Catalog**: 6 seeded labs (SQLi, XSS, Apache RCE, JWT none-alg, Kerberoasting, Container Escape) with difficulty, category, points, thumbnail, tier-gating.
- **Lab Lifecycle**: Simulated container Start / Stop / Reset with terminal-style log feed, IP+port assignment, 2h TTL.
- **Flag Submission**: SHA-256 hashed flag verification, points awarded on solve, completion badge on catalog.
- **Server Monitor**: Live CPU / RAM / network / running-container metrics, polled every 3s, animated SVG line chart, 150-second history window.
- **Analytics**: Lab popularity bars, success rates, leaderboard, platform-wide totals.
- **Profile**: Tier badge, biometric toggle, account details, sign-out.
- **SaaS Tiers + Stripe**: Student (free, easy/medium labs) vs Professional ($9.99/mo or $99/yr); server-side price catalog (no client tampering); Stripe Checkout via emergentintegrations; payment_transactions persistence; status polling auto-upgrades tier.

## Key Endpoints
- `POST /api/auth/register`, `/login`, `GET /api/auth/me`, `POST /api/auth/biometric`
- `GET /api/labs`, `GET /api/labs/{id}`, `POST /api/labs/{id}/start|stop|reset`, `POST /api/labs/submit-flag`
- `GET /api/metrics/server`, `GET /api/analytics`
- `GET /api/payments/packages`, `POST /api/payments/checkout`, `GET /api/payments/status/{session_id}`, `POST /api/payments/webhook`

## Seed Users
- `admin@cybershield.io` / `Admin@123` (Professional, admin)
- `student@cybershield.io` / `Student@123` (Student)

## SaaS Business Model
Tier-gated content (advanced labs locked behind Professional), priority compute story, leaderboard social proof, and a clear in-product upgrade CTA on Profile and Lab Detail screens to maximise free→paid conversion.
