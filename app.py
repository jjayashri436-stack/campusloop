import os
import json
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

COLLEGES_FILE = os.path.join(DATA_DIR, 'colleges.json')
STUDENTS_FILE = os.path.join(DATA_DIR, 'students.json')
SKILLS_FILE = os.path.join(DATA_DIR, 'skills.json')
REQUESTS_FILE = os.path.join(DATA_DIR, 'requests.json')

def read_json(path, default=None):
    if not os.path.exists(path):
        return default if default is not None else []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return default if default is not None else []

def write_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing {path}: {e}")
        return False

def get_current_user():
    students = read_json(STUDENTS_FILE, [])
    for stu in students:
        if stu.get('isCurrentUser'):
            return stu
    # Fallback to first student if not set
    if students:
        students[0]['isCurrentUser'] = True
        write_json(STUDENTS_FILE, students)
        return students[0]
    return None

# --- Static & Page Serving ---
@app.route('/')
def index():
    return render_template('index.html')

# --- API Endpoints ---

@app.route('/api/colleges', methods=['GET'])
def get_colleges():
    """Returns the country -> city -> college hierarchy."""
    colleges_data = read_json(COLLEGES_FILE, [])
    return jsonify({"success": True, "data": colleges_data})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Returns platform high-level metrics."""
    students = read_json(STUDENTS_FILE, [])
    skills = read_json(SKILLS_FILE, [])
    requests_list = read_json(REQUESTS_FILE, [])
    colleges_data = read_json(COLLEGES_FILE, [])
    
    total_colleges = 0
    for country in colleges_data:
        for city in country.get('cities', []):
            total_colleges += len(city.get('colleges', []))
            
    completed_exchanges = sum(1 for r in requests_list if r.get('status') == 'Completed') + 86

    return jsonify({
        "success": True,
        "stats": {
            "totalStudents": len(students) + 1420,
            "totalSkills": len(skills) + 2150,
            "totalColleges": total_colleges,
            "totalExchanges": completed_exchanges,
            "cost": "$0 Free Forever"
        }
    })

@app.route('/api/current-user', methods=['GET'])
def current_user_api():
    """Returns currently active user profile."""
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "No active user found"}), 404
    return jsonify({"success": True, "user": user})

@app.route('/api/current-user/switch/<student_id>', methods=['POST'])
def switch_user(student_id):
    """Switch active user for testing peer-to-peer exchanges seamlessly."""
    students = read_json(STUDENTS_FILE, [])
    found = False
    for s in students:
        if s['id'] == student_id:
            s['isCurrentUser'] = True
            found = True
        else:
            s['isCurrentUser'] = False
            
    if found:
        write_json(STUDENTS_FILE, students)
        return jsonify({"success": True, "message": "Switched active student"})
    return jsonify({"success": False, "message": "Student not found"}), 404

@app.route('/api/current-user/update', methods=['POST'])
def update_profile():
    """Update current student profile."""
    payload = request.json or {}
    students = read_json(STUDENTS_FILE, [])
    curr = None
    curr_idx = -1
    
    for i, s in enumerate(students):
        if s.get('isCurrentUser'):
            curr = s
            curr_idx = i
            break
            
    if not curr:
        return jsonify({"success": False, "message": "No user to update"}), 404

    # Update allowed fields
    for field in ['name', 'bio', 'college', 'city', 'country', 'department', 'year', 'avatar']:
        if field in payload and payload[field] is not None:
            curr[field] = payload[field]

    if 'skillsTaught' in payload and isinstance(payload['skillsTaught'], list):
        curr['skillsTaught'] = payload['skillsTaught']
    if 'skillsLearning' in payload and isinstance(payload['skillsLearning'], list):
        curr['skillsLearning'] = payload['skillsLearning']

    students[curr_idx] = curr
    write_json(STUDENTS_FILE, students)

    # Sync studentName & college in skills
    skills = read_json(SKILLS_FILE, [])
    updated_skills = False
    for sk in skills:
        if sk.get('studentId') == curr['id']:
            sk['studentName'] = curr['name']
            sk['college'] = curr['college']
            sk['city'] = curr['city']
            sk['country'] = curr['country']
            sk['studentAvatar'] = curr.get('avatar', sk.get('studentAvatar'))
            updated_skills = True
    if updated_skills:
        write_json(SKILLS_FILE, skills)

    return jsonify({"success": True, "user": curr, "message": "Profile updated successfully"})

@app.route('/api/students', methods=['GET'])
def get_students():
    """Filter and explore students."""
    students = read_json(STUDENTS_FILE, [])
    current_user = get_current_user() or {}
    
    search = request.args.get('search', '').strip().lower()
    college = request.args.get('college', '').strip()
    city = request.args.get('city', '').strip()
    country = request.args.get('country', '').strip()
    department = request.args.get('department', '').strip()
    year = request.args.get('year', '').strip()
    scope = request.args.get('scope', 'all') # 'all', 'same_campus', 'nearby', 'worldwide'
    exclude_self = request.args.get('exclude_self', 'false').lower() == 'true'

    filtered = []
    for s in students:
        if exclude_self and s.get('isCurrentUser'):
            continue

        # Scope filtering
        if scope == 'same_campus' and current_user.get('college'):
            if s.get('college') != current_user.get('college'):
                continue
        elif scope == 'nearby' and current_user.get('city'):
            if s.get('city') != current_user.get('city') or s.get('college') == current_user.get('college'):
                continue
        elif scope == 'worldwide' and current_user.get('city'):
            if s.get('city') == current_user.get('city'):
                continue

        # Direct filters
        if college and s.get('college', '').lower() != college.lower():
            continue
        if city and s.get('city', '').lower() != city.lower():
            continue
        if country and s.get('country', '').lower() != country.lower():
            continue
        if department and department.lower() not in s.get('department', '').lower():
            continue
        if year and year.lower() not in s.get('year', '').lower():
            continue

        # Search query across name, skills, department, college, bio
        if search:
            combined = " ".join([
                s.get('name', ''),
                s.get('college', ''),
                s.get('department', ''),
                s.get('bio', ''),
                " ".join(s.get('skillsTaught', [])),
                " ".join(s.get('skillsLearning', []))
            ]).lower()
            if search not in combined:
                continue

        filtered.append(s)

    return jsonify({"success": True, "count": len(filtered), "data": filtered})

@app.route('/api/students/<student_id>', methods=['GET'])
def get_student_details(student_id):
    students = read_json(STUDENTS_FILE, [])
    student = next((s for s in students if s['id'] == student_id), None)
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404
        
    skills = read_json(SKILLS_FILE, [])
    student_skills = [sk for sk in skills if sk.get('studentId') == student_id]
    
    return jsonify({
        "success": True,
        "student": student,
        "skills": student_skills
    })

@app.route('/api/skills', methods=['GET'])
def get_skills():
    """Explore and search skills."""
    skills = read_json(SKILLS_FILE, [])
    current_user = get_current_user() or {}

    search = request.args.get('search', '').strip().lower()
    category = request.args.get('category', '').strip()
    level = request.args.get('level', '').strip()
    mode = request.args.get('mode', '').strip()
    scope = request.args.get('scope', 'all') # 'all', 'same_campus', 'nearby', 'worldwide'
    college = request.args.get('college', '').strip()

    filtered = []
    for sk in skills:
        # Scope filter
        if scope == 'same_campus' and current_user.get('college'):
            if sk.get('college') != current_user.get('college'):
                continue
        elif scope == 'nearby' and current_user.get('city'):
            if sk.get('city') != current_user.get('city') or sk.get('college') == current_user.get('college'):
                continue
        elif scope == 'worldwide' and current_user.get('city'):
            if sk.get('city') == current_user.get('city'):
                continue

        if college and sk.get('college', '').lower() != college.lower():
            continue
        if category and category.lower() != 'all' and sk.get('category', '').lower() != category.lower():
            continue
        if level and level.lower() != 'all' and level.lower() not in sk.get('level', '').lower():
            continue
        if mode and mode.lower() != 'all' and mode.lower() not in sk.get('mode', '').lower():
            continue

        if search:
            combined = " ".join([
                sk.get('title', ''),
                sk.get('description', ''),
                sk.get('category', ''),
                sk.get('studentName', ''),
                sk.get('college', ''),
                " ".join(sk.get('topics', []))
            ]).lower()
            if search not in combined:
                continue

        filtered.append(sk)

    return jsonify({"success": True, "count": len(filtered), "data": filtered})

@app.route('/api/skills/upload', methods=['POST'])
def upload_skill():
    """Upload / register a new skill to teach."""
    payload = request.json or {}
    current_user = get_current_user()
    if not current_user:
        return jsonify({"success": False, "message": "User not authenticated"}), 401

    title = payload.get('title', '').strip()
    category = payload.get('category', '').strip()
    level = payload.get('level', 'Intermediate').strip()
    mode = payload.get('mode', 'Both (Online & Campus)').strip()
    description = payload.get('description', '').strip()
    topics_raw = payload.get('topics', [])
    duration = payload.get('duration', '45 mins / session').strip()
    availability = payload.get('availability', 'Flexible / On request').strip()
    prerequisites = payload.get('prerequisites', 'None').strip()

    if not title or not category or not description:
        return jsonify({"success": False, "message": "Title, category, and description are required"}), 400

    if isinstance(topics_raw, str):
        topics = [t.strip() for t in topics_raw.split('\n') if t.strip()]
    elif isinstance(topics_raw, list):
        topics = [str(t).strip() for t in topics_raw if str(t).strip()]
    else:
        topics = []

    skills = read_json(SKILLS_FILE, [])
    new_skill = {
        "id": f"sk-{uuid.uuid4().hex[:8]}",
        "studentId": current_user['id'],
        "studentName": current_user['name'],
        "studentAvatar": current_user.get('avatar', ''),
        "college": current_user['college'],
        "city": current_user['city'],
        "country": current_user['country'],
        "title": title,
        "category": category,
        "level": level,
        "mode": mode,
        "duration": duration,
        "rating": 5.0,
        "reviewCount": 1,
        "description": description,
        "topics": topics if topics else ["Fundamentals & practical hands-on examples"],
        "prerequisites": prerequisites,
        "availability": availability,
        "featured": False,
        "createdAt": datetime.now().strftime("%Y-%m-%d")
    }

    skills.insert(0, new_skill)
    write_json(SKILLS_FILE, skills)

    # Also ensure it appears in current_user's skillsTaught list
    students = read_json(STUDENTS_FILE, [])
    for s in students:
        if s['id'] == current_user['id']:
            if title not in s.get('skillsTaught', []):
                s.setdefault('skillsTaught', []).append(title)
            break
    write_json(STUDENTS_FILE, students)

    return jsonify({"success": True, "skill": new_skill, "message": "Skill uploaded successfully!"})

@app.route('/api/skills/<skill_id>', methods=['DELETE'])
def delete_skill(skill_id):
    current_user = get_current_user()
    skills = read_json(SKILLS_FILE, [])
    initial_len = len(skills)
    skills = [sk for sk in skills if not (sk['id'] == skill_id and sk.get('studentId') == current_user.get('id'))]
    
    if len(skills) < initial_len:
        write_json(SKILLS_FILE, skills)
        return jsonify({"success": True, "message": "Skill deleted successfully"})
    return jsonify({"success": False, "message": "Skill not found or unauthorized"}), 404

@app.route('/api/requests', methods=['GET'])
def get_requests():
    """Get sent and received requests for current student."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"success": False, "message": "No active user"}), 404

    requests_list = read_json(REQUESTS_FILE, [])
    received = [r for r in requests_list if r.get('receiverId') == current_user['id']]
    sent = [r for r in requests_list if r.get('senderId') == current_user['id']]

    return jsonify({
        "success": True,
        "received": received,
        "sent": sent,
        "total": len(received) + len(sent)
    })

@app.route('/api/requests/send', methods=['POST'])
def send_request():
    """Send a learning request to another student."""
    payload = request.json or {}
    current_user = get_current_user()
    if not current_user:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    receiver_id = payload.get('receiverId')
    skill_id = payload.get('skillId')
    goal = payload.get('goal', '').strip()
    preferred_time = payload.get('preferredTime', '').strip()
    message = payload.get('message', '').strip()
    exchange_offer = payload.get('exchangeOffer', '').strip()

    if not receiver_id or not goal:
        return jsonify({"success": False, "message": "Receiver and learning goal are required"}), 400

    students = read_json(STUDENTS_FILE, [])
    receiver = next((s for s in students if s['id'] == receiver_id), None)
    if not receiver:
        return jsonify({"success": False, "message": "Teacher not found"}), 404

    skills = read_json(SKILLS_FILE, [])
    skill = next((sk for sk in skills if sk['id'] == skill_id), None)
    skill_title = skill['title'] if skill else "Skill Mentorship Exchange"

    requests_list = read_json(REQUESTS_FILE, [])
    new_request = {
        "id": f"req-{uuid.uuid4().hex[:8]}",
        "senderId": current_user['id'],
        "senderName": current_user['name'],
        "senderAvatar": current_user.get('avatar', ''),
        "senderCollege": current_user.get('college', ''),
        "senderDepartment": current_user.get('department', ''),
        "receiverId": receiver['id'],
        "receiverName": receiver['name'],
        "skillId": skill_id,
        "skillTitle": skill_title,
        "goal": goal,
        "preferredTime": preferred_time or "Mutually agreed time slot",
        "status": "Pending",
        "message": message or f"Hi {receiver['name']}! I would love to learn {skill_title} from you on CampusLoop.",
        "exchangeOffer": exchange_offer or f"Offers: {', '.join(current_user.get('skillsTaught', ['Peer Collaboration'])[:2])}",
        "createdAt": datetime.now().isoformat() + "Z",
        "exchangeLink": ""
    }

    requests_list.insert(0, new_request)
    write_json(REQUESTS_FILE, requests_list)

    return jsonify({"success": True, "request": new_request, "message": "Learning request sent successfully!"})

@app.route('/api/requests/<req_id>/status', methods=['PATCH'])
def update_request_status(req_id):
    """Update status of a request: Accepted, Declined, Completed, etc."""
    payload = request.json or {}
    new_status = payload.get('status')
    if new_status not in ['Pending', 'Accepted', 'Declined', 'Completed', 'Cancelled']:
        return jsonify({"success": False, "message": "Invalid status"}), 400

    requests_list = read_json(REQUESTS_FILE, [])
    target = None
    for r in requests_list:
        if r['id'] == req_id:
            target = r
            break

    if not target:
        return jsonify({"success": False, "message": "Request not found"}), 404

    target['status'] = new_status
    if new_status == 'Accepted' and not target.get('exchangeLink'):
        target['exchangeLink'] = f"meet.campusloop.org/room-{uuid.uuid4().hex[:6]}"

    write_json(REQUESTS_FILE, requests_list)
    return jsonify({"success": True, "request": target, "message": f"Request marked as {new_status}"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting CampusLoop server on http://localhost:{port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
