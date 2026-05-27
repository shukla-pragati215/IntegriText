// ============ STATE ============
const state = { user: null, darkMode: true };
const API_URL =
    window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : window.location.origin;


// ============ HELPERS ============
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    show(t);
    setTimeout(() => hide(t), 2500);
}

function wordCount(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function downloadReport(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function downloadPDFReport(type, title, data, text) {
    // Header HTML
    let headerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">
            <div>
                <h1 style="font-size: 22px; color: #6366f1; margin: 0; font-weight: 800;">IntegriText</h1>
                <p style="font-size: 11px; color: #718096; margin: 2px 0 0 0;">AI-Powered Writing Suite</p>
            </div>
            <div style="text-align: right;">
                <h2 style="font-size: 15px; margin: 0; color: #1a202c;">${title}</h2>
                <p style="font-size: 10px; color: #718096; margin: 2px 0 0 0;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
    `;

    // Overview section based on type
    let overviewHTML = '';
    if (type === 'plagiarism') {
        const score = data.score;
        const plagPct = data.details.plagiarizedPct;
        const color = score >= 80 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#ef4444');
        overviewHTML = `
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px 15px; border: 1px solid #e2e8f0; margin-bottom: 15px; display: flex; align-items: center;">
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 5px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: ${color}; margin-right: 20px; flex-shrink: 0;">
                    ${score}%
                </div>
                <div>
                    <h3 style="font-size: 14px; margin: 0 0 4px 0; color: #1a202c; font-weight: 700;">Analysis Summary</h3>
                    <p style="margin: 0; font-size: 12px; color: #4a5568;">This document is <strong>${score}% Original</strong> and has <strong>${plagPct}% Match</strong> against active repositories.</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #718096;">Total Sentences Checked: ${data.details.sentencesChecked} | Matches Found: ${data.details.matchesFound}</p>
                </div>
            </div>
        `;
    } else if (type === 'ai-detect') {
        const score = data.score;
        const aiScore = data.details.aiScore;
        const verdict = data.details.verdict;
        const color = score >= 70 ? '#10b981' : (score >= 40 ? '#f59e0b' : '#ef4444');
        overviewHTML = `
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px 15px; border: 1px solid #e2e8f0; margin-bottom: 15px; display: flex; align-items: center;">
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 5px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: ${color}; margin-right: 20px; flex-shrink: 0;">
                    ${score}%
                </div>
                <div>
                    <h3 style="font-size: 14px; margin: 0 0 4px 0; color: #1a202c; font-weight: 700;">Detection Summary</h3>
                    <p style="margin: 0; font-size: 12px; color: #4a5568;">Verdict: <strong>${verdict}</strong> (Human Score: ${score}%, AI Score: ${aiScore}%)</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #718096;">Confidence: ${data.details.confidence}% | Burstiness Index: ${data.details.burstiness} | Vocab Hits: ${data.details.aiKeywordsFound}</p>
                </div>
            </div>
        `;
    } else if (type === 'grammar') {
        const score = data.score;
        const errCount = data.details.errorCount;
        const color = score >= 80 ? '#10b981' : (score >= 60 ? '#f59e0b' : '#ef4444');
        overviewHTML = `
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px 15px; border: 1px solid #e2e8f0; margin-bottom: 15px; display: flex; align-items: center;">
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 5px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: ${color}; margin-right: 20px; flex-shrink: 0;">
                    ${score}
                </div>
                <div>
                    <h3 style="font-size: 14px; margin: 0 0 4px 0; color: #1a202c; font-weight: 700;">Grammar Audit Summary</h3>
                    <p style="margin: 0; font-size: 12px; color: #4a5568;">Overall Score: <strong>${score}/100</strong>. Found <strong>${errCount} issues</strong> to correct.</p>
                </div>
            </div>
        `;
    }

    // Detail section based on type
    let detailsHTML = '';
    if (type === 'plagiarism' && data.details.sources && data.details.sources.length > 0) {
        let sourcesRows = data.details.sources.map((src, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; font-size: 11px; color: #4a5568; font-weight: 600;">#${i + 1}</td>
                <td style="padding: 8px; font-size: 11px; color: #2d3748;">${src.source}</td>
                <td style="padding: 8px; font-size: 11px; color: #718096; font-style: italic;">"${src.matchText}"</td>
            </tr>
        `).join('');
        detailsHTML = `
            <h3 style="font-size: 13px; color: #2d3748; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-weight: 700;">Matched Sources</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: left;">
                <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 8px; font-size: 10px; text-transform: uppercase; color: #718096; font-weight: 700;">ID</th>
                        <th style="padding: 8px; font-size: 10px; text-transform: uppercase; color: #718096; font-weight: 700;">Source Name</th>
                        <th style="padding: 8px; font-size: 10px; text-transform: uppercase; color: #718096; font-weight: 700;">Matched Segment</th>
                    </tr>
                </thead>
                <tbody>
                    ${sourcesRows}
                </tbody>
            </table>
        `;
    } else if (type === 'grammar' && data.details.issues && data.details.issues.length > 0) {
        let issueRows = data.details.issues.map((issue, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; font-size: 11px; color: #e53e3e; font-weight: 600;">${issue.type}</td>
                <td style="padding: 8px; font-size: 11px; color: #2d3748;">${issue.issue}</td>
                <td style="padding: 8px; font-size: 11px; color: #38a169; font-weight: 500;">${issue.fix}</td>
            </tr>
        `).join('');
        detailsHTML = `
            <h3 style="font-size: 13px; color: #2d3748; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-weight: 700;">Audit Issues Log</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: left;">
                <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 8px; font-size: 10px; text-transform: uppercase; color: #718096; font-weight: 700;">Category</th>
                        <th style="padding: 8px; font-size: 10px; text-transform: uppercase; color: #718096; font-weight: 700;">Problem Detected</th>
                        <th style="padding: 8px; font-size: 10px; text-transform: uppercase; color: #718096; font-weight: 700;">Recommended Fix</th>
                    </tr>
                </thead>
                <tbody>
                    ${issueRows}
                </tbody>
            </table>
        `;
    }

    // Input Text Section with Highlights
    let highlightedTextHTML = '';
    const cleanText = (text || '').trim();
    if (type === 'plagiarism') {
        highlightedTextHTML = getAnnotatedPlagiarismText(cleanText, data.details.sources || []);
    } else if (type === 'ai-detect') {
        highlightedTextHTML = getAnnotatedAiText(cleanText);
    } else if (type === 'grammar') {
        highlightedTextHTML = getAnnotatedGrammarText(cleanText, data.details.issues || []);
    } else {
        highlightedTextHTML = `<div style="white-space: pre-wrap;">${cleanText}</div>`;
    }

    const textHTML = `
        <h3 style="font-size: 13px; color: #2d3748; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-weight: 700;">Scanned Content Preview</h3>
        <div style="background-color: #fafafa; border: 1px solid #edf2f7; border-radius: 8px; padding: 12px; font-size: 11px; color: #4a5568; line-height: 1.5; margin-bottom: 15px;">
            ${highlightedTextHTML}
        </div>
    `;

    // Footer HTML
    const footerHTML = `
        <div style="border-top: 1px solid #edf2f7; padding-top: 10px; text-align: center; font-size: 9px; color: #a0aec0; margin-top: 10px;">
            This report was auto-generated by the secure IntegriText core platform. Integrity Checked.
        </div>
    `;

    // Compile Final HTML String
    const finalHTML = `
        <div style="padding: 20px; font-family: 'Inter', sans-serif; color: #333333; background: #ffffff; width: 794px;">
            ${headerHTML}
            ${overviewHTML}
            ${detailsHTML}
            ${textHTML}
            ${footerHTML}
        </div>
    `;

    const filename = `${title.replace(/\s+/g, '_')}_Report.pdf`;
    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(finalHTML).save().catch(err => {
        console.error('PDF Generation Error:', err);
    });
}

function getAnnotatedPlagiarismText(text, sources) {
    if (!sources || sources.length === 0) {
        return `<p style="white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; margin: 0;">${text}</p>`;
    }
    let annotated = text;
    const sorted = [...sources]
        .filter(s => s.matchText && s.matchText.trim() && s.matchText !== 'Common phrase match')
        .sort((a, b) => b.matchText.length - a.matchText.length);

    sorted.forEach((src) => {
        const escaped = src.matchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        annotated = annotated.replace(regex, `<span class="plag-annotated-match" style="background: rgba(239, 68, 68, 0.15); border-bottom: 2px dashed #ef4444; color: #ff6b6b; padding: 2px 4px; border-radius: 4px; font-weight: 500; cursor: help;" title="Source: ${src.source}">$1</span>`);
    });

    return `<div style="white-space: pre-wrap; font-size: 0.93rem; line-height: 1.75; font-family: 'Inter', sans-serif;">${annotated}</div>`;
}

function getAnnotatedAiText(text) {
    const aiKeywords = [
        'delve', 'testament', 'furthermore', 'moreover', 'tapestry',
        'in conclusion', 'it is important to note', 'demystify',
        'not only', 'but also', 'pinnacle', 'beacon', 'underpin',
        'multifaceted', 'think of it as', 'let\'s explore',
        'revolutionary', 'groundbreaking', 'subsequently', 'utilize'
    ];

    let annotated = text;
    aiKeywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
        annotated = annotated.replace(regex, `<span class="ai-annotated-match" style="background: rgba(139, 92, 246, 0.15); border-bottom: 2px dashed #8b5cf6; color: #a78bfa; padding: 2px 4px; border-radius: 4px; font-weight: 500; cursor: help;" title="Uniform transition / AI vocabulary hit">$1</span>`);
    });

    return `<div style="white-space: pre-wrap; font-size: 0.93rem; line-height: 1.75; font-family: 'Inter', sans-serif;">${annotated}</div>`;
}

function getAnnotatedGrammarText(text, issues) {
    if (!issues || issues.length === 0) {
        return `<p style="white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; margin: 0;">${text}</p>`;
    }
    let annotated = text;
    const sorted = [...issues]
        .filter(issue => issue.issue && issue.issue.trim())
        .sort((a, b) => b.issue.length - a.issue.length);

    sorted.forEach((issue) => {
        const escaped = issue.issue.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        annotated = annotated.replace(regex, `<span class="grammar-annotated-issue" style="background: rgba(245, 158, 11, 0.15); border-bottom: 2px dashed #f59e0b; color: #f59e0b; padding: 2px 4px; border-radius: 4px; font-weight: 500; cursor: help;" title="Category: ${issue.type} | Suggestion: ${issue.fix}">$1</span>`);
    });

    return `<div style="white-space: pre-wrap; font-size: 0.93rem; line-height: 1.75; font-family: 'Inter', sans-serif;">${annotated}</div>`;
}

function handleFileUpload(fileInput, textarea, wcSpan) {
    if (!fileInput) return;
    fileInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        toast(`Uploading and extracting text from "${file.name}"...`);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('it_token');
            const res = await fetch(`${API_URL}/api/scans/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'File upload failed');

            textarea.value = data.text;
            if (wcSpan) wcSpan.textContent = wordCount(data.text) + ' words';
            toast(`File "${file.name}" processed successfully!`);
        } catch (err) {
            toast(`Error: ${err.message}`);
        }
    });
}

// Get Auth Headers helper
function getHeaders() {
    const token = localStorage.getItem('it_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ============ AUTH ============
$('#signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim().toLowerCase();
    const password = $('#signupPassword').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');

        toast('Account created! Please sign in.');
        $('#signupForm').reset();
        show($('#loginForm'));
        hide($('#signupForm'));
    } catch (err) {
        toast(err.message);
    }
});

$('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const password = $('#loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        state.user = data.user;
        localStorage.setItem('it_token', data.token);
        localStorage.setItem('it_session', JSON.stringify(data.user));
        enterApp();
    } catch (err) {
        toast(err.message);
    }
});

$('#showSignup').addEventListener('click', e => {
    e.preventDefault();
    hide($('#loginForm'));
    show($('#signupForm'));
});

$('#showLogin').addEventListener('click', e => {
    e.preventDefault();
    show($('#loginForm'));
    hide($('#signupForm'));
});

$('#logoutBtn').addEventListener('click', e => {
    e.preventDefault();
    state.user = null;
    localStorage.removeItem('it_session');
    localStorage.removeItem('it_token');
    hide($('#mainApp'));
    show($('#authPage'));
    hide($('#profileDropdown'));
    toast('Logged out successfully!');
});

async function enterApp() {
    hide($('#authPage'));
    show($('#mainApp'));
    $('#dashboardUserName').textContent = state.user.name.split(' ')[0];
    $('#dropdownName').textContent = state.user.name;
    $('#dropdownEmail').textContent = state.user.email;
    $('#accName').value = state.user.name;
    $('#accEmail').value = state.user.email;
    switchPage('dashboard');
    loadHistory();
    loadChatHistory();
}

// Auto-login
(async function checkSession() {
    const s = localStorage.getItem('it_session');
    const token = localStorage.getItem('it_token');
    if (s && token) {
        state.user = JSON.parse(s);
        // Verify token validity
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const verifiedUser = await res.json();
                state.user = verifiedUser;
                localStorage.setItem('it_session', JSON.stringify(verifiedUser));
                enterApp();
            } else {
                localStorage.removeItem('it_session');
                localStorage.removeItem('it_token');
            }
        } catch (err) {
            console.error('Session verification failed, local fallback:', err);
            enterApp();
        }
    }
})();

// ============ PROFILE DROPDOWN ============
$('#profileBtn').addEventListener('click', e => {
    e.stopPropagation();
    $('#profileDropdown').classList.toggle('hidden');
});
document.addEventListener('click', () => hide($('#profileDropdown')));

// ============ DARK MODE ============
function applyTheme() {
    document.body.classList.toggle('light-mode', !state.darkMode);
    $('#darkModeLabel').textContent = state.darkMode ? 'Light Mode' : 'Dark Mode';
    const icon = state.darkMode ? 'ri-sun-line' : 'ri-moon-line';
    $('#darkModeToggleNav i').className = icon;
}
$('#darkModeToggle').addEventListener('click', e => {
    e.preventDefault();
    state.darkMode = !state.darkMode;
    localStorage.setItem('it_darkMode', state.darkMode);
    applyTheme();
});
$('#darkModeToggleNav').addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    localStorage.setItem('it_darkMode', state.darkMode);
    applyTheme();
});
state.darkMode = localStorage.getItem('it_darkMode') !== 'false';
applyTheme();

// ============ NAVIGATION ============
let pageHistoryStack = [];

function switchPage(name, isBack = false, skipHistoryState = false) {
    if (!isBack) {
        const currentActive = $('.tool-page.active');
        if (currentActive) {
            const currentPageId = currentActive.id.replace('page-', '');
            // Only push if navigating to a different page
            if (currentPageId !== name) {
                pageHistoryStack.push(currentPageId);
            }
        }
    }

    // Browser History API integration
    if (!skipHistoryState) {
        history.pushState({ page: name }, '', '#' + name);
    }

    $$('.tool-page').forEach(p => p.classList.remove('active'));
    const page = $(`#page-${name}`);
    if (page) page.classList.add('active');
    $$('.sidebar-item').forEach(s => s.classList.toggle('active', s.dataset.tool === name));
    hide($('#profileDropdown'));

    if (name === 'history') {
        loadHistory();
    }

    // Update Back Button visibility
    const backBtn = $('#navBackBtn');
    if (backBtn) {
        if (pageHistoryStack.length > 0 && name !== 'dashboard') {
            backBtn.classList.remove('hidden');
            backBtn.style.display = 'flex';
        } else {
            backBtn.classList.add('hidden');
            backBtn.style.display = 'none';
        }
    }

    // Auto-clear history if we go to dashboard manually (acts as home)
    if (name === 'dashboard' && !isBack) {
        pageHistoryStack = [];
    }
}

// Handle Browser Back/Forward buttons
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        if (pageHistoryStack.length > 0) {
            pageHistoryStack.pop();
        }
        switchPage(e.state.page, true, true);
    } else {
        switchPage('dashboard', true, true);
    }
});

// Handle initial load with hash routing
window.addEventListener('DOMContentLoaded', () => {
    const hashPage = window.location.hash.replace('#', '');
    if (hashPage && $(`#page-${hashPage}`)) {
        // Wait briefly for app to initialize before routing
        setTimeout(() => switchPage(hashPage, false, true), 100);
    } else {
        history.replaceState({ page: 'dashboard' }, '', '#dashboard');
    }
});

$$('.sidebar-item').forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.tool)));
$$('.tool-card[data-goto]').forEach(card => card.addEventListener('click', () => switchPage(card.dataset.goto)));
$$('.dropdown-item[data-page]').forEach(item => item.addEventListener('click', e => {
    e.preventDefault();
    switchPage(item.dataset.page);
}));

if ($('#navBackBtn')) {
    $('#navBackBtn').addEventListener('click', () => {
        if (pageHistoryStack.length > 0) {
            const prevPage = pageHistoryStack.pop();
            switchPage(prevPage, true);
        }
    });
}

// ============ ACCOUNT ============
$('#saveAccount').addEventListener('click', async () => {
    const name = $('#accName').value.trim();
    const password = $('#accPassword').value;

    const payload = {};
    if (name) payload.name = name;
    if (password) {
        if (password.length < 6) {
            toast('Password must be at least 6 characters!');
            return;
        }
        payload.password = password;
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/update`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update account');

        state.user = data;
        localStorage.setItem('it_session', JSON.stringify(state.user));
        $('#dropdownName').textContent = state.user.name;
        $('#dashboardUserName').textContent = state.user.name.split(' ')[0];
        $('#accPassword').value = '';
        toast('Account updated successfully!');
    } catch (err) {
        toast(err.message);
    }
});

// ============ WORD COUNTERS ============
['plagiarism:plagiarismWC', 'aiDetect:aiDetectWC', 'grammar:grammarWC'].forEach(pair => {
    const [id, wc] = pair.split(':');
    $(`#${id}Input`).addEventListener('input', function () {
        $(`#${wc}`).textContent = wordCount(this.value) + ' words';
    });
});

// Initialize file uploads
handleFileUpload($('#plagiarismFile'), $('#plagiarismInput'), $('#plagiarismWC'));
handleFileUpload($('#aiDetectFile'), $('#aiDetectInput'), $('#aiDetectWC'));
handleFileUpload($('#grammarFile'), $('#grammarInput'), $('#grammarWC'));

// ============ LOADING ELEMENT HELPER ============
function startLoading(btn) {
    const orig = btn.innerHTML;
    btn.dataset.origHtml = orig;
    btn.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    btn.disabled = true;
}
function stopLoading(btn) {
    if (btn.dataset.origHtml) {
        btn.innerHTML = btn.dataset.origHtml;
        btn.disabled = false;
    }
}

function createProgressRing(pct, color) {
    const r = 42, c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return `<div class="progress-ring-wrap">
        <div class="progress-ring"><svg width="100" height="100"><circle class="ring-bg" cx="50" cy="50" r="${r}"/><circle class="ring-fill" cx="50" cy="50" r="${r}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/></svg><div class="ring-label" style="color:${color}">${pct}%</div></div>
        <div class="result-details"></div></div>`;
}

// ============ PLAGIARISM CHECKER ============
$('#checkPlagiarism').addEventListener('click', async function () {
    const text = $('#plagiarismInput').value.trim();
    if (!text) { toast('Please enter some text!'); return; }

    startLoading(this);
    try {
        const res = await fetch(`${API_URL}/api/scans/plagiarism`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Scan failed');

        const orig = data.score;
        const plag = data.details.plagiarizedPct;
        const color = orig > 85 ? '#10b981' : orig > 60 ? '#f59e0b' : '#ef4444';

        let sourcesHtml = '';
        if (data.details.sources && data.details.sources.length > 0) {
            sourcesHtml = `<h5>Matched Sources:</h5>` + data.details.sources.map(src =>
                `<div class="highlight-issue" style="border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05)">
                    <strong>${src.source}:</strong> "${src.matchText}"
                </div>`
            ).join('');
        } else {
            sourcesHtml = `<p style="font-size:0.85rem; color:var(--text3);">No database matches found.</p>`;
        }

        const result = $('#plagiarismResult');
        const annotatedTextHtml = getAnnotatedPlagiarismText(text, data.details.sources || []);
        result.innerHTML = `
            <h4><i class="ri-shield-check-line"></i> Plagiarism Report Analysis</h4>
            <div class="result-layout">
                <div class="inspector-card">
                    <h5 style="margin-bottom: 12px; font-weight: 600; color: var(--accent2);"><i class="ri-article-line"></i> Document Inspector</h5>
                    ${annotatedTextHtml}
                </div>
                <div class="metrics-card">
                    <h5 style="font-weight: 600; color: var(--text);"><i class="ri-bar-chart-box-line"></i> Scan Metrics</h5>
                    ${createProgressRing(orig, color)}
                    <div class="result-details" style="display:flex; flex-direction:column; gap:8px;">
                        <p>Original Content: <span style="color:${color}; font-weight: 700;">${orig}%</span></p>
                        <p>Plagiarized Content: <span style="color:#ef4444; font-weight: 700;">${plag}%</span></p>
                        <p>Words Checked: <span style="font-weight: 700;">${wordCount(text)}</span></p>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 5px; max-height: 180px; overflow-y: auto;">
                        ${sourcesHtml}
                    </div>
                    <button class="btn-primary" id="downloadPlagReport" style="margin-top: auto; padding: 12px;"><i class="ri-download-2-line"></i> Download PDF Report</button>
                </div>
            </div>
        `;
        show(result);

        $('#downloadPlagReport').addEventListener('click', () => {
            downloadPDFReport('plagiarism', 'Plagiarism Scan Report', data, text);
        });

        loadHistory(); // Refresh history list
    } catch (err) {
        toast(err.message);
    } finally {
        stopLoading(this);
    }
});

// ============ AI DETECTOR ============
$('#detectAI').addEventListener('click', async function () {
    const text = $('#aiDetectInput').value.trim();
    if (!text) { toast('Please enter some text!'); return; }

    startLoading(this);
    try {
        const res = await fetch(`${API_URL}/api/scans/ai-detect`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Detection failed');

        const humanPct = data.score;
        const aiPct = data.details.aiScore;
        const color = humanPct > 70 ? '#10b981' : humanPct > 40 ? '#f59e0b' : '#ef4444';
        const label = data.details.verdict;

        const result = $('#aiDetectResult');
        const annotatedTextHtml = getAnnotatedAiText(text);
        result.innerHTML = `
            <h4><i class="ri-robot-2-line"></i> AI Detection Report</h4>
            <div class="result-layout">
                <div class="inspector-card">
                    <h5 style="margin-bottom: 12px; font-weight: 600; color: var(--accent2);"><i class="ri-article-line"></i> Document Inspector</h5>
                    ${annotatedTextHtml}
                </div>
                <div class="metrics-card">
                    <h5 style="font-weight: 600; color: var(--text);"><i class="ri-bar-chart-box-line"></i> Scan Metrics</h5>
                    ${createProgressRing(humanPct, color)}
                    <div class="result-details" style="display:flex; flex-direction:column; gap:8px;">
                        <p>Verdict: <span style="color:${color}; font-weight: 700;">${label}</span></p>
                        <p>Human Content: <span style="color:#10b981; font-weight: 700;">${humanPct}%</span></p>
                        <p>AI Content: <span style="color:#ef4444; font-weight: 700;">${aiPct}%</span></p>
                        <p>Sentence Burstiness: <span style="font-weight: 700;">${data.details.burstiness}</span></p>
                        <p>AI Keywords Detected: <span style="font-weight: 700;">${data.details.aiKeywordsFound}</span></p>
                    </div>
                    <button class="btn-primary" id="downloadAiReport" style="margin-top: auto; padding: 12px;"><i class="ri-download-2-line"></i> Download PDF Report</button>
                </div>
            </div>
        `;
        show(result);

        $('#downloadAiReport').addEventListener('click', () => {
            downloadPDFReport('ai-detect', 'AI Content Detection Report', data, text);
        });

        loadHistory();
    } catch (err) {
        toast(err.message);
    } finally {
        stopLoading(this);
    }
});

// ============ GRAMMAR CHECKER ============
$('#checkGrammar').addEventListener('click', async function () {
    const text = $('#grammarInput').value.trim();
    if (!text) { toast('Please enter some text!'); return; }

    startLoading(this);
    try {
        const res = await fetch(`${API_URL}/api/scans/grammar`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Check failed');

        const score = data.score;
        const color = score > 85 ? '#10b981' : score > 70 ? '#f59e0b' : '#ef4444';
        const result = $('#grammarResult');
        const annotatedTextHtml = getAnnotatedGrammarText(text, data.details.issues || []);

        let issuesListHtml = '';
        if (data.details.issues && data.details.issues.length > 0) {
            issuesListHtml = data.details.issues.map(issue =>
                `<div class="highlight-issue" style="margin-bottom: 8px; border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.05); padding: 8px 12px; font-size: 0.85rem;">
                    <strong>${issue.type}:</strong> "${issue.issue}" <i class="ri-arrow-right-line"></i> <span style="color: #10b981; font-weight: 600;">"${issue.fix}"</span>
                </div>`
            ).join('');
        } else {
            issuesListHtml = `<p style="color:#10b981; font-weight:600; margin:15px 0; font-size: 0.9rem;"><i class="ri-checkbox-circle-line"></i> No writing issues detected! Your text is pristine.</p>`;
        }

        result.innerHTML = `
            <h4><i class="ri-check-double-line"></i> Grammar Scan Analysis</h4>
            <div class="result-layout">
                <div class="inspector-card">
                    <h5 style="margin-bottom: 12px; font-weight: 600; color: var(--accent2);"><i class="ri-article-line"></i> Document Inspector</h5>
                    ${annotatedTextHtml}
                </div>
                <div class="metrics-card">
                    <h5 style="font-weight: 600; color: var(--text);"><i class="ri-bar-chart-box-line"></i> Scan Metrics</h5>
                    ${createProgressRing(score, color)}
                    <div class="result-details" style="display:flex; flex-direction:column; gap:8px;">
                        <p>Quality Index Score: <span style="color:${color}; font-weight: 700;">${score}/100</span></p>
                        <p>Total Issues Flagged: <span style="color:#f59e0b; font-weight: 700;">${data.details.issues ? data.details.issues.length : 0}</span></p>
                        <p>Words Checked: <span style="font-weight: 700;">${wordCount(text)}</span></p>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 5px; max-height: 180px; overflow-y: auto;">
                        <h6 style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Detailed Alerts:</h6>
                        ${issuesListHtml}
                    </div>
                    <button class="btn-primary" id="downloadGrammarReport" style="margin-top: auto; padding: 12px;"><i class="ri-download-2-line"></i> Download PDF Report</button>
                </div>
            </div>
        `;
        show(result);

        $('#downloadGrammarReport').addEventListener('click', () => {
            downloadPDFReport('grammar', 'Grammar Audit Report', data, text);
        });

        loadHistory();
    } catch (err) {
        toast(err.message);
    } finally {
        stopLoading(this);
    }
});

// ============ AI CHAT ============
function addChatMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `chat-bubble ${isUser ? 'user' : 'bot'}`;
    div.innerHTML = `<div class="chat-avatar"><i class="${isUser ? 'ri-user-3-fill' : 'ri-robot-2-fill'}"></i></div><div class="chat-text">${text}</div>`;
    $('#chatMessages').appendChild(div);
    $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
}

async function loadChatHistory() {
    try {
        const res = await fetch(`${API_URL}/api/chat`, {
            headers: getHeaders()
        });
        if (!res.ok) return;
        const messages = await res.json();

        // Clear chat area except welcoming message if history is empty
        const messagesDiv = $('#chatMessages');
        messagesDiv.innerHTML = '';

        if (messages.length === 0) {
            addChatMessage("Hello! I'm your AI writing assistant. How can I help you today?", false);
            return;
        }

        messages.forEach(msg => {
            addChatMessage(msg.message, msg.sender === 'user');
        });
    } catch (err) {
        console.error('Failed to load chat history', err);
    }
}

async function handleChat() {
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;

    addChatMessage(text, true);
    input.value = '';

    // Bot typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-bubble bot';
    typing.id = 'typingIndicator';
    typing.innerHTML = `<div class="chat-avatar"><i class="ri-robot-2-fill"></i></div><div class="chat-text"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
    $('#chatMessages').appendChild(typing);
    $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;

    try {
        const res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        typing.remove();

        if (!res.ok) throw new Error(data.message || 'Chat error');
        addChatMessage(data.botMsg.message, false);
    } catch (err) {
        typing.remove();
        addChatMessage(`Sorry, I couldn't reach the assistant server. Details: ${err.message}`, false);
    }
}

$('#chatSend').addEventListener('click', handleChat);
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleChat(); });

// ============ AI HUMANIZER ============
$('#humanizeText').addEventListener('click', async function () {
    const text = $('#humanizerInput').value.trim();
    if (!text) { toast('Please enter some text!'); return; }

    startLoading(this);
    try {
        const res = await fetch(`${API_URL}/api/scans/humanizer`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Humanization failed');

        $('#humanizerOutput').textContent = data.outputText;
        $('#humanizerOutput').style.color = 'var(--text)';
        toast('Text humanized successfully!');
        loadHistory();
    } catch (err) {
        toast(err.message);
    } finally {
        stopLoading(this);
    }
});

$('#copyHumanized').addEventListener('click', () => {
    const text = $('#humanizerOutput').textContent;
    if (text && text !== 'Your humanized text will appear here...') {
        navigator.clipboard.writeText(text);
        toast('Copied to clipboard!');
    }
});

// ============ TRANSLATE ============
$('#translateText').addEventListener('click', async function () {
    const text = $('#translateInput').value.trim();
    if (!text) { toast('Please enter some text!'); return; }
    const sourceLang = $('#sourceLang').value;
    const targetLang = $('#targetLang').value;

    startLoading(this);
    try {
        const res = await fetch(`${API_URL}/api/scans/translate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ text, sourceLang, targetLang })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Translation failed');

        $('#translateOutput').textContent = data.outputText;
        $('#translateOutput').style.color = 'var(--text)';
        toast('Translation complete!');
        loadHistory();
    } catch (err) {
        toast(err.message);
    } finally {
        stopLoading(this);
    }
});

$('#copyTranslation').addEventListener('click', () => {
    const text = $('#translateOutput').textContent;
    if (text && text !== 'Translation will appear here...') {
        navigator.clipboard.writeText(text);
        toast('Copied to clipboard!');
    }
});

// ============ CONTACT FORM ============
$('#sendContact').addEventListener('click', async (e) => {
    e.preventDefault();
    const inputs = $$('#page-contact input, #page-contact textarea');
    const name = inputs[0].value.trim();
    const email = inputs[1].value.trim();
    const message = inputs[2].value.trim();

    if (!name || !email || !message) {
        toast('Please fill all fields!');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });
        if (res.ok) {
            toast('Message sent! We\'ll get back to you soon.');
            inputs[0].value = '';
            inputs[1].value = '';
            inputs[2].value = '';
        } else {
            toast('Error sending message');
        }
    } catch (err) {
        toast('Failed to contact server');
    }
});

// ============ HISTORY LOADING & MANAGEMENT ============
async function loadHistory() {
    const container = $('#scanHistoryContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/api/scans/history`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Could not load history');
        const historyList = await res.json();

        if (historyList.length === 0) {
            container.innerHTML = '<p class="empty-history">No recent scans found. Try checking some text!</p>';
            return;
        }

        let html = '';
        historyList.forEach(item => {
            const date = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let iconClass = 'ri-file-text-line';
            let colorClass = 'tc-blue';
            let title = 'Scan';
            let scoreLabel = '';

            if (item.type === 'plagiarism') {
                iconClass = 'ri-file-search-line';
                colorClass = 'tc-blue';
                title = 'Plagiarism Checker';
                scoreLabel = `Original: ${item.score}%`;
            } else if (item.type === 'ai-detect') {
                iconClass = 'ri-robot-2-line';
                colorClass = 'tc-purple';
                title = 'AI Detector';
                scoreLabel = `Human: ${item.score}%`;
            } else if (item.type === 'grammar') {
                iconClass = 'ri-text';
                colorClass = 'tc-green';
                title = 'Grammar Checker';
                scoreLabel = `Score: ${item.score}/100`;
            } else if (item.type === 'humanizer') {
                iconClass = 'ri-user-heart-line';
                colorClass = 'tc-pink';
                title = 'AI Humanizer';
            } else if (item.type === 'translate') {
                iconClass = 'ri-translate-2';
                colorClass = 'tc-teal';
                title = `Translate (${item.details.sourceLang.toUpperCase()} → ${item.details.targetLang.toUpperCase()})`;
            }

            const snippet = item.inputText.substring(0, 70) + (item.inputText.length > 70 ? '...' : '');

            html += `
                <div class="history-card" data-id="${item._id}">
                    <div class="history-info">
                        <div class="history-icon ${colorClass}"><i class="${iconClass}"></i></div>
                        <div class="history-details">
                            <div class="history-title-row">
                                <h4>${title}</h4>
                                <span class="history-date">${date}</span>
                            </div>
                            <p class="history-snippet">"${snippet}"</p>
                        </div>
                    </div>
                    <div class="history-actions">
                        ${scoreLabel ? `<div class="history-score-badge ${colorClass}-badge">${scoreLabel}</div>` : ''}
                        <button class="btn-delete-history" title="Delete Record" onclick="deleteHistoryItem('${item._id}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        renderDashboardChart(historyList);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="empty-history" style="color:#ef4444;">Failed to load history from database.</p>';
    }
}

let dashboardChartInstance = null;
function renderDashboardChart(historyList) {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    // Filter and sort items chronologically (oldest to newest)
    const scoredItems = historyList
        .filter(item => ['plagiarism', 'ai-detect', 'grammar'].includes(item.type))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(-30); // Keep last 30 scans to extend chart history length

    if (scoredItems.length === 0) {
        ctx.style.display = 'none';
        const trendSection = ctx.closest('.dashboard-section');
        if (trendSection) trendSection.style.display = 'none';
        return;
    } else {
        ctx.style.display = 'block';
        const trendSection = ctx.closest('.dashboard-section');
        if (trendSection) trendSection.style.display = 'block';
    }

    // Group scans by date for labels
    const labels = scoredItems.map(item => new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    // Build datasets representing user's writing quality progression
    const datasets = [
        {
            label: 'Originality % (Plagiarism Free)',
            data: scoredItems.map(item => item.type === 'plagiarism' ? item.score : null),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            borderWidth: 3,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
            tension: 0.35,
            spanGaps: true
        },
        {
            label: 'Humanity % (AI Avoidance)',
            data: scoredItems.map(item => item.type === 'ai-detect' ? item.score : null),
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.05)',
            borderWidth: 3,
            pointBackgroundColor: '#ec4899',
            pointRadius: 4,
            tension: 0.35,
            spanGaps: true
        },
        {
            label: 'Grammar Index Score',
            data: scoredItems.map(item => item.type === 'grammar' ? item.score : null),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 3,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            tension: 0.35,
            spanGaps: true
        }
    ];

    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
    }

    const isDark = !document.body.classList.contains('light-mode');
    dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: isDark ? '#f0f0f5' : '#1a1a2e',
                        font: { family: "'Inter', sans-serif", size: 11, weight: '500' }
                    }
                },
                tooltip: {
                    padding: 12,
                    cornerRadius: 8,
                    bodyFont: { family: "'Inter', sans-serif" },
                    titleFont: { family: "'Inter', sans-serif", weight: 'bold' }
                }
            },
            scales: {
                x: {
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
                    ticks: { color: isDark ? '#9a9ab0' : '#555570', font: { family: "'Inter', sans-serif", size: 10 } }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' },
                    ticks: { color: isDark ? '#9a9ab0' : '#555570', font: { family: "'Inter', sans-serif", size: 10 } }
                }
            }
        }
    });
}

// Global function for onclick deletes
window.deleteHistoryItem = async function (id) {
    if (!confirm('Are you sure you want to delete this scan record?')) return;
    try {
        const res = await fetch(`${API_URL}/api/scans/history/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Deletion failed');
        toast('Record deleted!');
        loadHistory();
    } catch (err) {
        toast(err.message);
    }
};
