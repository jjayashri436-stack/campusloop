// CampusLoop Application State & Controller
const state = {
  currentUser: null,
  collegesData: [],
  allStudents: [],
  allSkills: [],
  requestsData: { received: [], sent: [] },
  stats: {},
  currentView: 'home',
  
  // Filters
  skillsFilter: {
    search: '',
    category: 'all',
    scope: 'all', // 'all', 'same_campus', 'nearby', 'worldwide'
    level: 'all',
    mode: 'all'
  },
  studentsFilter: {
    search: '',
    scope: 'same_campus', // default to campus for instant community feeling
    year: 'all',
    department: ''
  },
  requestsFilter: {
    tab: 'received', // 'received' or 'sent'
    status: 'all'
  }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  initLucide();
  await loadColleges();
  await loadCurrentUser();
  await loadStats();
  await loadSkills();
  await loadStudents();
  await loadRequests();

  setupEventListeners();
  handleRouting();
  window.addEventListener('hashchange', handleRouting);
});

function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- API Calls ---
async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    showToast('Network error or server unavailable', 'error');
    return { success: false, message: err.message };
  }
}

async function loadCurrentUser() {
  const res = await fetchAPI('/api/current-user');
  if (res.success && res.user) {
    state.currentUser = res.user;
    updateUserUI();
  }
}

async function loadColleges() {
  const res = await fetchAPI('/api/colleges');
  if (res.success && res.data) {
    state.collegesData = res.data;
  }
}

async function loadStats() {
  const res = await fetchAPI('/api/stats');
  if (res.success && res.stats) {
    state.stats = res.stats;
    renderStats();
  }
}

async function loadSkills() {
  const params = new URLSearchParams();
  if (state.skillsFilter.search) params.append('search', state.skillsFilter.search);
  if (state.skillsFilter.category && state.skillsFilter.category !== 'all') params.append('category', state.skillsFilter.category);
  if (state.skillsFilter.level && state.skillsFilter.level !== 'all') params.append('level', state.skillsFilter.level);
  if (state.skillsFilter.mode && state.skillsFilter.mode !== 'all') params.append('mode', state.skillsFilter.mode);
  if (state.skillsFilter.scope && state.skillsFilter.scope !== 'all') params.append('scope', state.skillsFilter.scope);

  const res = await fetchAPI(`/api/skills?${params.toString()}`);
  if (res.success) {
    state.allSkills = res.data || [];
    renderSkillsGrid();
    renderFeaturedSkills();
  }
}

async function loadStudents() {
  const params = new URLSearchParams();
  if (state.studentsFilter.search) params.append('search', state.studentsFilter.search);
  if (state.studentsFilter.scope && state.studentsFilter.scope !== 'all') params.append('scope', state.studentsFilter.scope);
  if (state.studentsFilter.year && state.studentsFilter.year !== 'all') params.append('year', state.studentsFilter.year);
  if (state.studentsFilter.department) params.append('department', state.studentsFilter.department);

  const res = await fetchAPI(`/api/students?${params.toString()}`);
  if (res.success) {
    state.allStudents = res.data || [];
    renderStudentsGrid();
    renderTopMentors();
  }
}

async function loadRequests() {
  const res = await fetchAPI('/api/requests');
  if (res.success) {
    state.requestsData = {
      received: res.received || [],
      sent: res.sent || []
    };
    updateRequestBadges();
    renderRequestsList();
  }
}

// --- Routing & View Management ---
function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const validViews = ['home', 'dashboard', 'skills', 'students', 'upload', 'requests', 'profile'];
  const targetView = validViews.includes(hash) ? hash : 'home';
  navigateTo(targetView, false);
}

function navigateTo(viewName, updateHash = true) {
  state.currentView = viewName;
  if (updateHash) {
    window.location.hash = viewName;
  }

  // Hide all view containers
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

  // Show target view container
  const targetEl = document.getElementById(`view-${viewName}`);
  if (targetEl) {
    targetEl.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update navbar active link
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.view === viewName) {
      link.classList.add('text-indigo-600', 'font-semibold');
      link.classList.remove('text-slate-600');
    } else {
      link.classList.remove('text-indigo-600', 'font-semibold');
      link.classList.add('text-slate-600');
    }
  });

  // Re-render contextual view data
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'profile') renderProfilePage();
  if (viewName === 'skills') renderSkillsGrid();
  if (viewName === 'students') renderStudentsGrid();
  if (viewName === 'requests') renderRequestsList();

  initLucide();
}

// --- UI Updates ---
function updateUserUI() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  // Nav User details
  const navAvatar = document.getElementById('nav-user-avatar');
  const navName = document.getElementById('nav-user-name');
  const navCollege = document.getElementById('nav-user-college');
  const campusBadge = document.getElementById('current-campus-badge');

  if (navAvatar) navAvatar.src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
  if (navName) navName.textContent = user.name;
  if (navCollege) navCollege.textContent = user.college.split('(')[0].trim();
  if (campusBadge) {
    campusBadge.innerHTML = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm cursor-pointer hover:bg-indigo-100 transition-colors" onclick="openCollegeModal()">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="truncate max-w-[180px] sm:max-w-[240px]">${user.college.split('(')[0].trim()}</span>
        <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-indigo-500"></i>
      </span>
    `;
  }

  // Update active campus in home hero
  const heroCampusTag = document.getElementById('hero-campus-name');
  if (heroCampusTag) {
    heroCampusTag.textContent = user.college;
  }

  // Update tabs label
  const campusSkillTab = document.getElementById('skills-tab-campus');
  if (campusSkillTab) {
    campusSkillTab.textContent = `My Campus (${user.college.split('(')[0].trim().substring(0, 16)}...)`;
  }
  const campusStuTab = document.getElementById('students-tab-campus');
  if (campusStuTab) {
    campusStuTab.textContent = `My Campus (${user.college.split('(')[0].trim().substring(0, 16)}...)`;
  }

  initLucide();
}

function updateRequestBadges() {
  const pendingReceived = state.requestsData.received.filter(r => r.status === 'Pending').length;
  const badgeEl = document.getElementById('nav-requests-badge');
  const mobileBadgeEl = document.getElementById('mobile-requests-badge');
  
  if (badgeEl) {
    if (pendingReceived > 0) {
      badgeEl.textContent = pendingReceived;
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  }
  if (mobileBadgeEl) {
    if (pendingReceived > 0) {
      mobileBadgeEl.textContent = pendingReceived;
      mobileBadgeEl.classList.remove('hidden');
    } else {
      mobileBadgeEl.classList.add('hidden');
    }
  }
}

function renderStats() {
  const studentsCount = document.getElementById('stat-students');
  const skillsCount = document.getElementById('stat-skills');
  const collegesCount = document.getElementById('stat-colleges');
  const exchangesCount = document.getElementById('stat-exchanges');

  if (studentsCount) studentsCount.textContent = (state.stats.totalStudents || 1432).toLocaleString() + '+';
  if (skillsCount) skillsCount.textContent = (state.stats.totalSkills || 2160).toLocaleString() + '+';
  if (collegesCount) collegesCount.textContent = (state.stats.totalColleges || 24) + '+ Universities';
  if (exchangesCount) exchangesCount.textContent = (state.stats.totalExchanges || 92).toLocaleString() + '+ Completed';
}

// --- Home View Renderers ---
function renderFeaturedSkills() {
  const container = document.getElementById('featured-skills-container');
  if (!container) return;

  const featured = state.allSkills.slice(0, 6);
  if (featured.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500">Loading skills...</div>`;
    return;
  }

  container.innerHTML = featured.map(sk => createSkillCardHTML(sk, true)).join('');
  initLucide();
}

function renderTopMentors() {
  const container = document.getElementById('top-mentors-container');
  if (!container) return;

  const mentors = state.allStudents.slice(0, 4);
  container.innerHTML = mentors.map(m => createStudentCardHTML(m)).join('');
  initLucide();
}

// --- Skills Grid & Card Component ---
function createSkillCardHTML(sk, isCompact = false) {
  const isMyCampus = state.currentUser && sk.college === state.currentUser.college;
  const badgeClass = isMyCampus 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
    : 'bg-indigo-50 text-indigo-700 border-indigo-200';
  const badgeText = isMyCampus ? 'My Campus' : (sk.city || 'Global');

  return `
    <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between relative group">
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass} border">
            ${isMyCampus ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>' : '<i data-lucide="globe" class="w-3 h-3"></i>'}
            ${badgeText}
          </span>
          <div class="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
            <i data-lucide="star" class="w-3 h-3 fill-amber-400"></i>
            <span>${sk.rating || 5.0}</span>
            <span class="text-slate-400 font-normal">(${sk.reviewCount || 1})</span>
          </div>
        </div>

        <h3 class="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
          ${escapeHTML(sk.title)}
        </h3>

        <p class="text-slate-600 text-sm line-clamp-2 mb-4 leading-relaxed">
          ${escapeHTML(sk.description)}
        </p>

        <!-- Topics preview -->
        <div class="flex flex-wrap gap-1.5 mb-5">
          ${(sk.topics || []).slice(0, 3).map(t => `
            <span class="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
              ${escapeHTML(t)}
            </span>
          `).join('')}
          ${(sk.topics || []).length > 3 ? `<span class="text-[11px] text-slate-400 self-center">+${sk.topics.length - 3} more</span>` : ''}
        </div>
      </div>

      <div class="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div class="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity" onclick="viewStudentModal('${sk.studentId}')">
          <img src="${sk.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" alt="${escapeHTML(sk.studentName)}" class="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-100" />
          <div class="text-left">
            <p class="text-xs font-bold text-slate-900 leading-tight">${escapeHTML(sk.studentName)}</p>
            <p class="text-[11px] text-slate-500 truncate max-w-[120px]">${escapeHTML(sk.college.split('(')[0])}</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button onclick="viewSkillDetails('${sk.id}')" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Curriculum & Details">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
          <button onclick="openRequestModal('${sk.studentId}', '${sk.id}')" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all">
            <span>Learn Free</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSkillsGrid() {
  const container = document.getElementById('skills-grid-container');
  const countLabel = document.getElementById('skills-result-count');
  if (!container) return;

  if (state.allSkills.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="book-open" class="w-8 h-8"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-800">No skills found</h3>
        <p class="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Try broadening your search keyword or switching between My Campus and Global colleges.</p>
        <button onclick="resetSkillFilters()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Reset All Filters
        </button>
      </div>
    `;
    if (countLabel) countLabel.textContent = `0 skills found`;
    initLucide();
    return;
  }

  container.innerHTML = state.allSkills.map(sk => createSkillCardHTML(sk)).join('');
  if (countLabel) countLabel.textContent = `Showing ${state.allSkills.length} skills ready to learn`;
  initLucide();
}

// --- Students Grid & Card Component ---
function createStudentCardHTML(s) {
  const isCurrent = state.currentUser && s.id === state.currentUser.id;
  const isMyCampus = state.currentUser && s.college === state.currentUser.college;

  return `
    <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between relative group">
      <div>
        <div class="flex items-start gap-4 mb-4">
          <div class="relative">
            <img src="${s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}" alt="${escapeHTML(s.name)}" class="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-50 shadow-sm" />
            ${s.verified ? `
              <span class="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm" title="Verified College Student">
                <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
              </span>
            ` : ''}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">${escapeHTML(s.name)}</h3>
              <div class="flex items-center gap-1 text-amber-500 text-xs font-bold">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                <span>${s.rating || 5.0}</span>
              </div>
            </div>
            
            <p class="text-xs font-medium text-indigo-600 truncate mt-0.5">${escapeHTML(s.department)}</p>
            <p class="text-[11px] text-slate-500">${escapeHTML(s.year)}</p>
          </div>
        </div>

        <!-- Campus indicator badge -->
        <div class="mb-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${isMyCampus ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-slate-100 text-slate-700'} max-w-full truncate">
            <i data-lucide="school" class="w-3.5 h-3.5 shrink-0 text-slate-400"></i>
            <span class="truncate">${escapeHTML(s.college)}</span>
          </span>
        </div>

        <p class="text-slate-600 text-xs line-clamp-2 leading-relaxed mb-4">
          ${escapeHTML(s.bio || 'Excited to exchange knowledge and collaborate with campus peers!')}
        </p>

        <!-- Skills Can Teach -->
        <div class="mb-3">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <i data-lucide="award" class="w-3 h-3 text-indigo-500"></i>
            Can Teach:
          </p>
          <div class="flex flex-wrap gap-1">
            ${(s.skillsTaught || []).slice(0, 3).map(sk => `
              <span class="text-[11px] bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-md border border-indigo-100/60">
                ${escapeHTML(sk)}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Skills Want To Learn -->
        ${(s.skillsLearning || []).length > 0 ? `
          <div class="mb-4">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <i data-lucide="sparkles" class="w-3 h-3 text-cyan-500"></i>
              Wants To Learn:
            </p>
            <div class="flex flex-wrap gap-1">
              ${s.skillsLearning.slice(0, 2).map(sk => `
                <span class="text-[11px] bg-slate-50 text-slate-600 font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
                  ${escapeHTML(sk)}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center gap-2 mt-auto">
        <button onclick="viewStudentModal('${s.id}')" class="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
          View Profile
        </button>
        ${!isCurrent ? `
          <button onclick="openRequestModal('${s.id}', null)" class="flex-1 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-1">
            <i data-lucide="message-square-plus" class="w-3.5 h-3.5"></i>
            <span>Request</span>
          </button>
        ` : `
          <span class="text-xs font-medium text-emerald-600 px-3 py-2 bg-emerald-50 rounded-xl text-center">
            You (Active)
          </span>
        `}
      </div>
    </div>
  `;
}

function renderStudentsGrid() {
  const container = document.getElementById('students-grid-container');
  const countLabel = document.getElementById('students-result-count');
  if (!container) return;

  if (state.allStudents.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <i data-lucide="users" class="w-8 h-8"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-800">No students found</h3>
        <p class="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Try switching between "My Campus" and "Worldwide Universities" or clear your department search filter.</p>
        <button onclick="resetStudentFilters()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Show All Students
        </button>
      </div>
    `;
    if (countLabel) countLabel.textContent = `0 students found`;
    initLucide();
    return;
  }

  container.innerHTML = state.allStudents.map(s => createStudentCardHTML(s)).join('');
  if (countLabel) countLabel.textContent = `Showing ${state.allStudents.length} verified campus peers`;
  initLucide();
}

// --- Dashboard View Renderer ---
function renderDashboard() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  // Header info
  document.getElementById('dash-student-name').textContent = user.name;
  document.getElementById('dash-student-college').textContent = user.college;
  document.getElementById('dash-student-dept').textContent = `${user.department} • ${user.year}`;
  document.getElementById('dash-student-avatar').src = user.avatar;

  // Stats
  const userSkills = state.allSkills.filter(sk => sk.studentId === user.id);
  const userReceivedReqs = state.requestsData.received;
  const userSentReqs = state.requestsData.sent;
  const activeExchanges = [...userReceivedReqs, ...userSentReqs].filter(r => r.status === 'Accepted');

  document.getElementById('dash-stat-skills').textContent = userSkills.length;
  document.getElementById('dash-stat-active').textContent = activeExchanges.length;
  document.getElementById('dash-stat-completed').textContent = user.exchangesCompleted || 14;
  document.getElementById('dash-stat-rating').textContent = (user.rating || 4.9).toFixed(1);

  // Active exchanges list
  const activeContainer = document.getElementById('dash-active-exchanges-container');
  if (activeContainer) {
    if (activeExchanges.length === 0) {
      activeContainer.innerHTML = `
        <div class="py-8 text-center text-slate-500 text-sm">
          No active exchange right now. Send a learning request or accept an incoming request below!
        </div>
      `;
    } else {
      activeContainer.innerHTML = activeExchanges.map(r => `
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <i data-lucide="video" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">${escapeHTML(r.skillTitle)}</h4>
              <p class="text-xs text-slate-500">Partner: <span class="font-semibold text-slate-700">${escapeHTML(r.senderId === user.id ? r.receiverName : r.senderName)}</span> (${escapeHTML(r.preferredTime)})</p>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            ${r.exchangeLink ? `
              <a href="https://${r.exchangeLink}" target="_blank" class="flex-1 sm:flex-none text-center px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1">
                <i data-lucide="video" class="w-3.5 h-3.5"></i>
                <span>Join Call</span>
              </a>
            ` : ''}
            <button onclick="updateRequestStatus('${r.id}', 'Completed')" class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors">
              Mark Completed
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  // My uploaded skills list
  const mySkillsContainer = document.getElementById('dash-my-skills-container');
  if (mySkillsContainer) {
    if (userSkills.length === 0) {
      mySkillsContainer.innerHTML = `
        <div class="py-8 text-center text-slate-500 text-sm">
          You haven't listed any skills yet. Share what you can teach to unlock free peer exchanges!
          <div class="mt-3">
            <button onclick="navigateTo('upload')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
              + Upload Skill
            </button>
          </div>
        </div>
      `;
    } else {
      mySkillsContainer.innerHTML = userSkills.map(sk => `
        <div class="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">${escapeHTML(sk.category)}</span>
              <span class="text-xs text-slate-400">• ${sk.mode}</span>
            </div>
            <h4 class="text-sm font-bold text-slate-900 truncate">${escapeHTML(sk.title)}</h4>
            <p class="text-xs text-slate-500 mt-0.5">${sk.duration} • Rating ${sk.rating} ★</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="viewSkillDetails('${sk.id}')" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="View">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteSkill('${sk.id}')" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Delete">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  // Campus peers recommendations
  const recommendedContainer = document.getElementById('dash-recommended-container');
  if (recommendedContainer) {
    const peers = state.allStudents.filter(s => s.id !== user.id).slice(0, 3);
    recommendedContainer.innerHTML = peers.map(p => `
      <div class="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${p.avatar}" class="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0" />
          <div class="min-w-0">
            <h4 class="text-sm font-bold text-slate-900 truncate">${escapeHTML(p.name)}</h4>
            <p class="text-xs text-slate-500 truncate">${escapeHTML(p.department)}</p>
            <p class="text-[11px] text-indigo-600 truncate font-medium">Teaches: ${(p.skillsTaught || []).slice(0, 2).join(', ')}</p>
          </div>
        </div>
        <button onclick="viewStudentModal('${p.id}')" class="shrink-0 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
          Connect
        </button>
      </div>
    `).join('');
  }

  initLucide();
}

// --- Requests View Renderer ---
function renderRequestsList() {
  const container = document.getElementById('requests-list-container');
  if (!container) return;

  const isReceivedTab = state.requestsFilter.tab === 'received';
  const list = isReceivedTab ? state.requestsData.received : state.requestsData.sent;
  
  // Status filter
  const filtered = list.filter(r => {
    if (state.requestsFilter.status === 'all') return true;
    return r.status.toLowerCase() === state.requestsFilter.status.toLowerCase();
  });

  const tabReceivedBtn = document.getElementById('tab-req-received');
  const tabSentBtn = document.getElementById('tab-req-sent');
  if (tabReceivedBtn && tabSentBtn) {
    if (isReceivedTab) {
      tabReceivedBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-sm transition-all';
      tabSentBtn.className = 'px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all';
    } else {
      tabSentBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-sm transition-all';
      tabReceivedBtn.className = 'px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all';
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center bg-white rounded-2xl border border-slate-200">
        <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <i data-lucide="inbox" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-bold text-slate-800">No ${state.requestsFilter.status !== 'all' ? state.requestsFilter.status : ''} requests found</h3>
        <p class="text-sm text-slate-500 mt-1">
          ${isReceivedTab ? 'When students request to learn from your listed skills, they will show up here.' : 'Explore skills and request free sessions from peers.'}
        </p>
        ${!isReceivedTab ? `
          <button onclick="navigateTo('skills')" class="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700">
            Browse Skills
          </button>
        ` : ''}
      </div>
    `;
    initLucide();
    return;
  }

  container.innerHTML = filtered.map(r => {
    let statusBadge = '';
    if (r.status === 'Pending') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Response</span>';
    } else if (r.status === 'Accepted') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Accepted & Scheduled</span>';
    } else if (r.status === 'Completed') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><i data-lucide="check-circle" class="w-3 h-3"></i> Completed</span>';
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">${r.status}</span>`;
    }

    const otherPersonName = isReceivedTab ? r.senderName : r.receiverName;
    const otherPersonAvatar = isReceivedTab ? r.senderAvatar : '';
    const otherPersonCollege = isReceivedTab ? r.senderCollege : '';

    return `
      <div class="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <img src="${otherPersonAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-50" />
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-bold text-slate-900">${escapeHTML(otherPersonName)}</h4>
                <span class="text-xs text-slate-400">• ${isReceivedTab ? 'Wants to learn from you' : 'Mentorship Request'}</span>
              </div>
              <p class="text-xs text-slate-500">${escapeHTML(otherPersonCollege || 'Campus Peer')}</p>
            </div>
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>

        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">Requested Skill</span>
            <h3 class="text-base font-bold text-slate-900">${escapeHTML(r.skillTitle)}</h3>
          </div>
          <p class="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
            <span class="font-bold text-slate-900">Learning Goal:</span> ${escapeHTML(r.goal)}
          </p>
          ${r.message ? `
            <p class="text-xs text-slate-600 mt-2 px-1 italic">
              "${escapeHTML(r.message)}"
            </p>
          ` : ''}
        </div>

        <div class="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1 text-slate-700">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-500"></i>
            <span>Preferred: <strong>${escapeHTML(r.preferredTime)}</strong></span>
          </div>
          <div class="flex items-center gap-1 text-emerald-700">
            <i data-lucide="gift" class="w-3.5 h-3.5 text-emerald-500"></i>
            <span>${escapeHTML(r.exchangeOffer || 'Free Knowledge Exchange')}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-end gap-2 pt-2">
          ${isReceivedTab && r.status === 'Pending' ? `
            <button onclick="updateRequestStatus('${r.id}', 'Declined')" class="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors">
              Decline
            </button>
            <button onclick="updateRequestStatus('${r.id}', 'Accepted')" class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all flex items-center gap-1">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              <span>Accept & Generate Room</span>
            </button>
          ` : ''}

          ${r.status === 'Accepted' ? `
            ${r.exchangeLink ? `
              <a href="https://${r.exchangeLink}" target="_blank" class="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1">
                <i data-lucide="video" class="w-3.5 h-3.5"></i>
                <span>Open Virtual Room</span>
              </a>
            ` : ''}
            <button onclick="updateRequestStatus('${r.id}', 'Completed')" class="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors">
              Mark Completed
            </button>
          ` : ''}

          ${!isReceivedTab && r.status === 'Pending' ? `
            <button onclick="updateRequestStatus('${r.id}', 'Cancelled')" class="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
              Cancel Request
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  initLucide();
}

async function updateRequestStatus(requestId, newStatus) {
  const res = await fetchAPI(`/api/requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });

  if (res.success) {
    showToast(`Request ${newStatus.toLowerCase()}!`, 'success');
    await loadRequests();
    if (state.currentView === 'dashboard') renderDashboard();
  } else {
    showToast(res.message || 'Error updating request', 'error');
  }
}

// --- Profile View Renderer ---
function renderProfilePage() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  document.getElementById('prof-name').textContent = user.name;
  document.getElementById('prof-avatar').src = user.avatar;
  document.getElementById('prof-college').textContent = user.college;
  document.getElementById('prof-dept').textContent = user.department;
  document.getElementById('prof-year').textContent = user.year;
  document.getElementById('prof-location').textContent = `${user.city}, ${user.country}`;
  document.getElementById('prof-bio').textContent = user.bio || 'Passionate student learner and mentor.';
  document.getElementById('prof-badge').textContent = user.badge || 'Verified Student';
  document.getElementById('prof-rating').textContent = (user.rating || 4.9).toFixed(1);
  document.getElementById('prof-reviews-count').textContent = user.reviewCount || 18;
  document.getElementById('prof-exchanges-count').textContent = user.exchangesCompleted || 14;

  // Skills taught tags
  const taughtContainer = document.getElementById('prof-skills-taught');
  if (taughtContainer) {
    taughtContainer.innerHTML = (user.skillsTaught || []).map(sk => `
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
        <i data-lucide="award" class="w-3.5 h-3.5 text-indigo-500"></i>
        ${escapeHTML(sk)}
      </span>
    `).join('');
  }

  // Skills want to learn tags
  const learnContainer = document.getElementById('prof-skills-learning');
  if (learnContainer) {
    learnContainer.innerHTML = (user.skillsLearning || []).map(sk => `
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-emerald-500"></i>
        ${escapeHTML(sk)}
      </span>
    `).join('');
  }

  initLucide();
}

// --- Skill Upload Form Logic ---
async function handleSkillUpload(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Uploading...';

  const topicsText = document.getElementById('upload-topics').value;
  const payload = {
    title: document.getElementById('upload-title').value.trim(),
    category: document.getElementById('upload-category').value,
    level: document.getElementById('upload-level').value,
    mode: document.getElementById('upload-mode').value,
    duration: document.getElementById('upload-duration').value,
    availability: document.getElementById('upload-availability').value.trim(),
    prerequisites: document.getElementById('upload-prereq').value.trim() || 'None',
    description: document.getElementById('upload-description').value.trim(),
    topics: topicsText.split('\n').map(t => t.trim()).filter(Boolean)
  };

  const res = await fetchAPI('/api/skills/upload', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span>List Skill on CampusLoop</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
  initLucide();

  if (res.success) {
    showToast('Your skill has been listed successfully!', 'success');
    form.reset();
    await loadSkills();
    await loadCurrentUser();
    navigateTo('skills');
  } else {
    showToast(res.message || 'Error listing skill', 'error');
  }
}

async function deleteSkill(skillId) {
  if (!confirm('Are you sure you want to remove this skill listing?')) return;
  const res = await fetchAPI(`/api/skills/${skillId}`, { method: 'DELETE' });
  if (res.success) {
    showToast('Skill removed', 'info');
    await loadSkills();
    await loadCurrentUser();
    if (state.currentView === 'dashboard') renderDashboard();
  } else {
    showToast(res.message || 'Failed to delete skill', 'error');
  }
}

// --- Modals Logic ---

// 1. College Selection Modal
function openCollegeModal() {
  const modal = document.getElementById('college-modal');
  if (!modal) return;

  populateCollegeDropdowns();
  modal.classList.remove('hidden');
  initLucide();
}

function closeCollegeModal() {
  const modal = document.getElementById('college-modal');
  if (modal) modal.classList.add('hidden');
}

function populateCollegeDropdowns() {
  const countrySel = document.getElementById('modal-select-country');
  const citySel = document.getElementById('modal-select-city');
  const collegeSel = document.getElementById('modal-select-college');

  if (!countrySel || !citySel || !collegeSel) return;

  countrySel.innerHTML = state.collegesData.map(c => `
    <option value="${c.country}" ${state.currentUser && state.currentUser.country === c.country ? 'selected' : ''}>
      ${c.country}
    </option>
  `).join('');

  function onCountryChange() {
    const selectedCountry = state.collegesData.find(c => c.country === countrySel.value) || state.collegesData[0];
    citySel.innerHTML = (selectedCountry.cities || []).map(city => `
      <option value="${city.city}" ${state.currentUser && state.currentUser.city === city.city ? 'selected' : ''}>
        ${city.city}
      </option>
    `).join('');
    onCityChange();
  }

  function onCityChange() {
    const selectedCountry = state.collegesData.find(c => c.country === countrySel.value) || state.collegesData[0];
    const selectedCity = (selectedCountry.cities || []).find(ci => ci.city === citySel.value) || selectedCountry.cities[0];
    collegeSel.innerHTML = (selectedCity.colleges || []).map(col => `
      <option value="${col}" ${state.currentUser && state.currentUser.college === col ? 'selected' : ''}>
        ${col}
      </option>
    `).join('');
  }

  countrySel.onchange = onCountryChange;
  citySel.onchange = onCityChange;

  onCountryChange();
}

async function saveSelectedCollege() {
  const country = document.getElementById('modal-select-country').value;
  const city = document.getElementById('modal-select-city').value;
  const college = document.getElementById('modal-select-college').value;

  const res = await fetchAPI('/api/current-user/update', {
    method: 'POST',
    body: JSON.stringify({ country, city, college })
  });

  if (res.success) {
    showToast(`Campus updated to ${college.split('(')[0]}!`, 'success');
    state.currentUser = res.user;
    updateUserUI();
    closeCollegeModal();
    await loadSkills();
    await loadStudents();
    if (state.currentView === 'dashboard') renderDashboard();
    if (state.currentView === 'profile') renderProfilePage();
  } else {
    showToast('Failed to update college', 'error');
  }
}

// 2. Request Learning Modal
function openRequestModal(studentId, skillId = null) {
  const modal = document.getElementById('request-modal');
  if (!modal) return;

  const student = state.allStudents.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('req-modal-receiver-id').value = student.id;
  document.getElementById('req-modal-receiver-name').textContent = student.name;
  document.getElementById('req-modal-receiver-college').textContent = student.college;
  document.getElementById('req-modal-receiver-avatar').src = student.avatar;

  // Populate skills dropdown for this student
  const skillSelect = document.getElementById('req-modal-skill-select');
  const studentSkills = state.allSkills.filter(sk => sk.studentId === studentId);

  if (studentSkills.length > 0) {
    skillSelect.innerHTML = studentSkills.map(sk => `
      <option value="${sk.id}" ${skillId === sk.id ? 'selected' : ''}>
        ${escapeHTML(sk.title)} (${sk.duration})
      </option>
    `).join('');
  } else {
    skillSelect.innerHTML = `<option value="">General Peer Mentorship (${student.department})</option>`;
  }

  // Prepopulate exchange offer with current user's skills
  const offerInput = document.getElementById('req-modal-exchange-offer');
  if (offerInput && state.currentUser) {
    offerInput.value = `Can trade: ${(state.currentUser.skillsTaught || []).slice(0, 2).join(' or ')}`;
  }

  modal.classList.remove('hidden');
  initLucide();
}

function closeRequestModal() {
  const modal = document.getElementById('request-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleSendRequest(e) {
  e.preventDefault();
  const receiverId = document.getElementById('req-modal-receiver-id').value;
  const skillId = document.getElementById('req-modal-skill-select').value;
  const goal = document.getElementById('req-modal-goal').value.trim();
  const preferredTime = document.getElementById('req-modal-time').value.trim();
  const message = document.getElementById('req-modal-message').value.trim();
  const exchangeOffer = document.getElementById('req-modal-exchange-offer').value.trim();

  if (!goal) {
    showToast('Please specify what you want to learn or build', 'error');
    return;
  }

  const res = await fetchAPI('/api/requests/send', {
    method: 'POST',
    body: JSON.stringify({
      receiverId,
      skillId,
      goal,
      preferredTime,
      message,
      exchangeOffer
    })
  });

  if (res.success) {
    showToast('Learning request sent successfully!', 'success');
    closeRequestModal();
    await loadRequests();
    navigateTo('requests');
  } else {
    showToast(res.message || 'Error sending request', 'error');
  }
}

// 3. Student Details Modal
async function viewStudentModal(studentId) {
  const res = await fetchAPI(`/api/students/${studentId}`);
  if (!res.success) return;

  const { student, skills } = res;
  const modal = document.getElementById('student-modal');
  if (!modal) return;

  document.getElementById('stu-modal-avatar').src = student.avatar;
  document.getElementById('stu-modal-name').textContent = student.name;
  document.getElementById('stu-modal-college').textContent = student.college;
  document.getElementById('stu-modal-dept').textContent = `${student.department} • ${student.year}`;
  document.getElementById('stu-modal-location').textContent = `${student.city}, ${student.country}`;
  document.getElementById('stu-modal-bio').textContent = student.bio;
  document.getElementById('stu-modal-rating').textContent = (student.rating || 5.0).toFixed(1);
  document.getElementById('stu-modal-exchanges').textContent = student.exchangesCompleted || 12;

  // Skills taught list
  const skillsListEl = document.getElementById('stu-modal-skills-list');
  if (skills.length > 0) {
    skillsListEl.innerHTML = skills.map(sk => `
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
        <div>
          <h5 class="text-xs font-bold text-slate-900">${escapeHTML(sk.title)}</h5>
          <p class="text-[11px] text-slate-500">${sk.level} • ${sk.mode} • ${sk.duration}</p>
        </div>
        <button onclick="closeStudentModal(); openRequestModal('${student.id}', '${sk.id}')" class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
          Request
        </button>
      </div>
    `).join('');
  } else {
    skillsListEl.innerHTML = `
      <div class="text-xs text-slate-500 italic">No formal courses listed yet, but open to peer knowledge sharing.</div>
    `;
  }

  // Connect button
  const reqBtn = document.getElementById('stu-modal-req-btn');
  if (reqBtn) {
    if (state.currentUser && student.id === state.currentUser.id) {
      reqBtn.classList.add('hidden');
    } else {
      reqBtn.classList.remove('hidden');
      reqBtn.onclick = () => {
        closeStudentModal();
        openRequestModal(student.id, null);
      };
    }
  }

  modal.classList.remove('hidden');
  initLucide();
}

function closeStudentModal() {
  const modal = document.getElementById('student-modal');
  if (modal) modal.classList.add('hidden');
}

// 4. Skill Details Modal
function viewSkillDetails(skillId) {
  const sk = state.allSkills.find(s => s.id === skillId);
  if (!sk) return;

  const modal = document.getElementById('skill-modal');
  if (!modal) return;

  document.getElementById('skill-modal-title').textContent = sk.title;
  document.getElementById('skill-modal-category').textContent = sk.category;
  document.getElementById('skill-modal-level').textContent = sk.level;
  document.getElementById('skill-modal-mode').textContent = sk.mode;
  document.getElementById('skill-modal-duration').textContent = sk.duration;
  document.getElementById('skill-modal-desc').textContent = sk.description;
  document.getElementById('skill-modal-prereq').textContent = sk.prerequisites || 'None';
  document.getElementById('skill-modal-avail').textContent = sk.availability || 'Flexible';
  document.getElementById('skill-modal-rating').textContent = (sk.rating || 5.0).toFixed(1);

  // Topics
  const topicsEl = document.getElementById('skill-modal-topics');
  topicsEl.innerHTML = (sk.topics || []).map(t => `
    <li class="flex items-start gap-2 text-xs text-slate-700">
      <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"></i>
      <span>${escapeHTML(t)}</span>
    </li>
  `).join('');

  // Mentor card inside modal
  document.getElementById('skill-modal-mentor-avatar').src = sk.studentAvatar;
  document.getElementById('skill-modal-mentor-name').textContent = sk.studentName;
  document.getElementById('skill-modal-mentor-college').textContent = sk.college;

  // Request button
  const reqBtn = document.getElementById('skill-modal-req-btn');
  reqBtn.onclick = () => {
    closeSkillDetailsModal();
    openRequestModal(sk.studentId, sk.id);
  };

  modal.classList.remove('hidden');
  initLucide();
}

function closeSkillDetailsModal() {
  const modal = document.getElementById('skill-modal');
  if (modal) modal.classList.add('hidden');
}

// 5. Edit Profile Modal
function openEditProfileModal() {
  if (!state.currentUser) return;
  const user = state.currentUser;
  const modal = document.getElementById('edit-profile-modal');
  if (!modal) return;

  document.getElementById('edit-prof-name').value = user.name;
  document.getElementById('edit-prof-dept').value = user.department;
  document.getElementById('edit-prof-year').value = user.year;
  document.getElementById('edit-prof-bio').value = user.bio || '';
  document.getElementById('edit-prof-learning').value = (user.skillsLearning || []).join(', ');

  modal.classList.remove('hidden');
}

function closeEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleProfileSave(e) {
  e.preventDefault();
  const name = document.getElementById('edit-prof-name').value.trim();
  const department = document.getElementById('edit-prof-dept').value.trim();
  const year = document.getElementById('edit-prof-year').value;
  const bio = document.getElementById('edit-prof-bio').value.trim();
  const learningText = document.getElementById('edit-prof-learning').value;

  const skillsLearning = learningText.split(',').map(s => s.trim()).filter(Boolean);

  const res = await fetchAPI('/api/current-user/update', {
    method: 'POST',
    body: JSON.stringify({ name, department, year, bio, skillsLearning })
  });

  if (res.success) {
    showToast('Profile updated!', 'success');
    state.currentUser = res.user;
    updateUserUI();
    closeEditProfileModal();
    renderProfilePage();
    if (state.currentView === 'dashboard') renderDashboard();
  } else {
    showToast('Failed to update profile', 'error');
  }
}

// 6. Switch Persona Modal (Peer-to-peer demonstration switcher)
function openPersonaModal() {
  const modal = document.getElementById('persona-modal');
  if (!modal) return;

  const container = document.getElementById('persona-list-container');
  container.innerHTML = state.allStudents.map(s => `
    <div onclick="switchPersona('${s.id}')" class="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group">
      <div class="flex items-center gap-3">
        <img src="${s.avatar}" class="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100" />
        <div>
          <h4 class="text-sm font-bold text-slate-900 group-hover:text-indigo-600">${escapeHTML(s.name)} ${s.id === state.currentUser?.id ? '<span class="text-xs text-emerald-600 font-normal">(Active)</span>' : ''}</h4>
          <p class="text-xs text-slate-500">${escapeHTML(s.college.split('(')[0])} • ${escapeHTML(s.department)}</p>
        </div>
      </div>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 group-hover:text-indigo-600"></i>
    </div>
  `).join('');

  modal.classList.remove('hidden');
  initLucide();
}

function closePersonaModal() {
  const modal = document.getElementById('persona-modal');
  if (modal) modal.classList.add('hidden');
}

async function switchPersona(studentId) {
  const res = await fetchAPI(`/api/current-user/switch/${studentId}`, { method: 'POST' });
  if (res.success) {
    showToast('Switched persona!', 'success');
    closePersonaModal();
    await loadCurrentUser();
    await loadSkills();
    await loadStudents();
    await loadRequests();
    if (state.currentView === 'dashboard') renderDashboard();
    if (state.currentView === 'profile') renderProfilePage();
  }
}

// --- Setup Event Listeners ---
function setupEventListeners() {
  // Navigation Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      if (view) navigateTo(view);
      
      // Close mobile menu if open
      const mobileNav = document.getElementById('mobile-nav-menu');
      if (mobileNav) mobileNav.classList.add('hidden');
    });
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav-menu');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // Home Hero Search
  const heroSearchInput = document.getElementById('hero-search-input');
  const heroSearchBtn = document.getElementById('hero-search-btn');
  if (heroSearchBtn && heroSearchInput) {
    heroSearchBtn.addEventListener('click', () => {
      const q = heroSearchInput.value.trim();
      state.skillsFilter.search = q;
      navigateTo('skills');
      const skillsSearchInput = document.getElementById('skills-search-input');
      if (skillsSearchInput) skillsSearchInput.value = q;
      loadSkills();
    });
    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') heroSearchBtn.click();
    });
  }

  // Skills Filters
  const skillsSearch = document.getElementById('skills-search-input');
  if (skillsSearch) {
    skillsSearch.addEventListener('input', debounce((e) => {
      state.skillsFilter.search = e.target.value.trim();
      loadSkills();
    }, 300));
  }

  const categoryPills = document.querySelectorAll('.skill-category-pill');
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('bg-indigo-600', 'text-white'));
      categoryPills.forEach(p => p.classList.add('bg-slate-100', 'text-slate-700'));
      pill.classList.remove('bg-slate-100', 'text-slate-700');
      pill.classList.add('bg-indigo-600', 'text-white');
      state.skillsFilter.category = pill.dataset.category;
      loadSkills();
    });
  });

  const skillScopeTabs = document.querySelectorAll('.skills-scope-tab');
  skillScopeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      skillScopeTabs.forEach(t => t.classList.remove('tab-active', 'text-indigo-600'));
      tab.classList.add('tab-active');
      state.skillsFilter.scope = tab.dataset.scope;
      loadSkills();
    });
  });

  const skillLevelSelect = document.getElementById('skills-level-filter');
  if (skillLevelSelect) {
    skillLevelSelect.addEventListener('change', (e) => {
      state.skillsFilter.level = e.target.value;
      loadSkills();
    });
  }

  const skillModeSelect = document.getElementById('skills-mode-filter');
  if (skillModeSelect) {
    skillModeSelect.addEventListener('change', (e) => {
      state.skillsFilter.mode = e.target.value;
      loadSkills();
    });
  }

  // Students Filters
  const studentsSearch = document.getElementById('students-search-input');
  if (studentsSearch) {
    studentsSearch.addEventListener('input', debounce((e) => {
      state.studentsFilter.search = e.target.value.trim();
      loadStudents();
    }, 300));
  }

  const studentsScopeTabs = document.querySelectorAll('.students-scope-tab');
  studentsScopeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      studentsScopeTabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');
      state.studentsFilter.scope = tab.dataset.scope;
      loadStudents();
    });
  });

  const studentsYearSelect = document.getElementById('students-year-filter');
  if (studentsYearSelect) {
    studentsYearSelect.addEventListener('change', (e) => {
      state.studentsFilter.year = e.target.value;
      loadStudents();
    });
  }

  // Requests tabs
  const tabReqReceived = document.getElementById('tab-req-received');
  const tabReqSent = document.getElementById('tab-req-sent');
  if (tabReqReceived && tabReqSent) {
    tabReqReceived.addEventListener('click', () => {
      state.requestsFilter.tab = 'received';
      renderRequestsList();
    });
    tabReqSent.addEventListener('click', () => {
      state.requestsFilter.tab = 'sent';
      renderRequestsList();
    });
  }

  const reqStatusFilter = document.getElementById('requests-status-filter');
  if (reqStatusFilter) {
    reqStatusFilter.addEventListener('change', (e) => {
      state.requestsFilter.status = e.target.value;
      renderRequestsList();
    });
  }

  // Forms
  const uploadForm = document.getElementById('skill-upload-form');
  if (uploadForm) uploadForm.addEventListener('submit', handleSkillUpload);

  const requestForm = document.getElementById('send-request-form');
  if (requestForm) requestForm.addEventListener('submit', handleSendRequest);

  const editProfileForm = document.getElementById('edit-profile-form');
  if (editProfileForm) editProfileForm.addEventListener('submit', handleProfileSave);

  // Live Skill Upload Preview
  setupUploadLivePreview();
}

function setupUploadLivePreview() {
  const titleInput = document.getElementById('upload-title');
  const catInput = document.getElementById('upload-category');
  const descInput = document.getElementById('upload-description');
  const previewTitle = document.getElementById('preview-skill-title');
  const previewCategory = document.getElementById('preview-skill-cat');
  const previewDesc = document.getElementById('preview-skill-desc');

  if (titleInput && previewTitle) {
    titleInput.addEventListener('input', (e) => {
      previewTitle.textContent = e.target.value.trim() || 'Skill Title Will Appear Here';
    });
  }
  if (catInput && previewCategory) {
    catInput.addEventListener('change', (e) => {
      previewCategory.textContent = e.target.value || 'Category';
    });
  }
  if (descInput && previewDesc) {
    descInput.addEventListener('input', (e) => {
      previewDesc.textContent = e.target.value.trim() || 'Describe what peers will learn during your mentorship session...';
    });
  }
}

function resetSkillFilters() {
  state.skillsFilter = { search: '', category: 'all', scope: 'all', level: 'all', mode: 'all' };
  const sInput = document.getElementById('skills-search-input');
  if (sInput) sInput.value = '';
  document.querySelectorAll('.skill-category-pill').forEach((p, idx) => {
    if (idx === 0) {
      p.className = 'skill-category-pill px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-sm';
    } else {
      p.className = 'skill-category-pill px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors';
    }
  });
  document.querySelectorAll('.skills-scope-tab').forEach((t, idx) => {
    if (idx === 0) t.classList.add('tab-active');
    else t.classList.remove('tab-active');
  });
  loadSkills();
}

function resetStudentFilters() {
  state.studentsFilter = { search: '', scope: 'all', year: 'all', department: '' };
  const sInput = document.getElementById('students-search-input');
  if (sInput) sInput.value = '';
  document.querySelectorAll('.students-scope-tab').forEach((t, idx) => {
    if (idx === 2) t.classList.add('tab-active'); // All / Worldwide
    else t.classList.remove('tab-active');
  });
  loadStudents();
}

// --- Utilities ---
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-box');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-box';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white';
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';

  toast.className = `toast-msg flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold ${bg}`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  initLucide();

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
