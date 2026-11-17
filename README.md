# CampusLoop 🎓

> **"Start with your campus. Connect with the world."**

CampusLoop is a complete, modern, attractive, and fully functional student skill-sharing platform connecting students from colleges and universities worldwide to teach and learn skills completely free.

---

## ✨ Core Features

1. **College Selection**
   - Select your Country, City, and College/University.
   - Dynamic hierarchy pre-loaded with top institutions across India, USA, UK, Canada, Germany, Singapore, and more.
   - Instantly customizes the whole platform to your active campus hub.

2. **Verified Student Profiles**
   - Detailed student cards with student name, verified college, department, academic year (freshman to senior/graduate), bio, skills taught, skills wanted, badges, and ratings.
   - Verified student status indicators with college affiliation.

3. **Skill Upload**
   - Comprehensive skill registration form with live card preview.
   - Categories: Coding & Development, Design & Creative, Video Editing & Media, Communication & Languages, Academics & Engineering.
   - Teaching modes: Online, Campus In-Person, or Both.
   - Weekly availability, session duration, topics curriculum list, and prerequisites.

4. **Campus-Based Discovery**
   - 1-click filter for your own campus ("My Campus").
   - Easily connect with seniors, juniors, and classmates from the same college with zero hesitation.

5. **Cross-College Learning**
   - Discover and learn from peers in nearby colleges (same city) and worldwide universities (Stanford, Oxford, IIT Madras, NUS, TU Munich, etc.).

6. **Skill Search & Requests**
   - Live interactive search and multi-criteria filters.
   - Direct request modal with specified learning goal, proposed time slot, personal message, and barter exchange offer.

7. **Free Skill Exchange**
   - 100% free peer-to-peer knowledge sharing—no payments, subscriptions, or credit cards.
   - Complete exchange tracking: Pending, Accepted, and Completed statuses.
   - Automatic virtual meeting room link generation upon accepting a request.

---

## 🚀 Running the Project Locally

Run with Python 3:

```bash
# Optional: install dependencies
py -m pip install -r requirements.txt

# Start CampusLoop
py run.py
```

The application will start on:
👉 **`http://localhost:5000`** (or your designated port)

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python / Flask REST API
- **Data Storage**: JSON persistence layer (`data/colleges.json`, `data/students.json`, `data/skills.json`, `data/requests.json`)
- **Frontend**: Responsive Single-Page Application (SPA) with client-side routing
- **Styling**: Tailwind CSS + Custom CSS animations and glassmorphism
- **Icons**: Lucide Icons
- **Typography**: Google Fonts (Plus Jakarta Sans & Inter)
