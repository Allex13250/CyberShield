# CyberShield 🛡️

A mobile application that uses AI to detect whether an image is legitimate or fraudulent.
Upload or capture any photo and get an instant authenticity verdict — built to help users
spot scam listings, fake product images, and manipulated media.

## What It Does

- 📸 Accepts a photo from camera or gallery
- 🤖 Runs the image through a Python-based ML classification model
- ✅ Returns a clear legitimate / suspicious verdict in real time

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | TypeScript |
| ML Backend | Python |
| Image Classification | Machine Learning model (image authenticity detection) |

## Why I Built It

Online scams increasingly rely on fake or manipulated images — fake product photos,
doctored screenshots, AI-generated fraud. CyberShield makes it easy for anyone to
do a quick legitimacy check before trusting an image.

## Getting Started

```bash
# Clone the repo
git clone [github.com](https://github.com/Allex13250/CyberShield)

# Install frontend dependencies
npm install

# Install Python backend dependencies
pip install -r requirements.txt

CyberShield/
├── src/          # TypeScript mobile frontend
├── backend/      # Python ML inference layer
└── README.md
