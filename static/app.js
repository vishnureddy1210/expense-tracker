// app.js — ExpenseTracker🔥💰 Frontend Controller

// Application State
let supabaseClient = null;
let currentUser = null;
let currentExpenses = [];
let categoryDonutChart = null;
let momBarChart = null;
let isRecoveringPassword = false;

// Constants — Warm, earth-tone palette for Claude-like aesthetic
const CATEGORY_STYLE = {
    "Food": { emoji: "🍜", bg: "#fef3e2", fg: "#92550a", chart: "#e8a14e" },
    "Travel": { emoji: "✈️", bg: "#eef6f9", fg: "#1a6f8a", chart: "#5bb5cc" },
    "Bills": { emoji: "🧾", bg: "#eef7f0", fg: "#2d7a4a", chart: "#5cb87a" },
    "Shopping": { emoji: "🛍️", bg: "#f5eef8", fg: "#7c3aad", chart: "#a878c8" },
    "Entertainment": { emoji: "🎬", bg: "#fceeed", fg: "#b33a3a", chart: "#d4726e" },
    "Other": { emoji: "📌", bg: "#f0eeec", fg: "#5a5550", chart: "#9a9590" },
};

// On Page Load
document.addEventListener("DOMContentLoaded", async () => {
    setupEventListeners();
    setTodayDateInput();

    // Fetch Supabase configuration from server API
    try {
        const res = await fetch("/api/config");
        const config = await res.json();

        if (!config.supabaseUrl || !config.supabaseKey) {
            showToast("Supabase config is missing. Check server environment.", "danger");
            return;
        }

        // Initialize Supabase
        supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

        // Check for password recovery/reset hash
        handlePasswordResetLanding();

        // Monitor Auth State Changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                isRecoveringPassword = true;
                showAuthPage("reset");
                history.replaceState(null, null, ' '); // Clear hash safely after Supabase parses it
            } else if (event === "SIGNED_IN" && session) {
                const hash = window.location.hash;
                if (hash && hash.includes("type=recovery")) {
                    isRecoveringPassword = true;
                    showAuthPage("reset");
                    history.replaceState(null, null, ' ');
                } else if (!isRecoveringPassword) {
                    currentUser = session.user;
                    showDashboard();
                }
            } else if (event === "SIGNED_OUT") {
                currentUser = null;
                currentExpenses = [];
                showAuthPage("login");
            }
        });

        // Check current session
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session) {
            if (!isRecoveringPassword) {
                currentUser = session.user;
                showDashboard();
            } else {
                showAuthPage("reset");
            }
        } else {
            if (!isRecoveringPassword) {
                showAuthPage("login");
            }
        }

    } catch (err) {
        console.error("Initialization error:", err);
        showToast("Error connecting to backend server", "danger");
    }
});

// Setup Form and Navigation Event Listeners
function setupEventListeners() {
    // Auth Forms
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("signup-form").addEventListener("submit", handleSignup);
    document.getElementById("forgot-form").addEventListener("submit", handleForgotPassword);
    document.getElementById("reset-form").addEventListener("submit", handleResetPassword);

    // Dashboard Forms / Actions
    document.getElementById("add-expense-form").addEventListener("submit", handleAddExpense);
    document.getElementById("logout-btn").addEventListener("click", handleLogout);

    // Settings Tab
    document.getElementById("settings-password-form").addEventListener("submit", handleSettingsPasswordChange);
    document.getElementById("settings-forgot-btn").addEventListener("click", handleSettingsForgotPassword);
    document.getElementById("theme-toggle-input").addEventListener("change", handleThemeToggle);

    // Sidebar Navigation Toggling
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // AI Insights Generator
    document.getElementById("generate-insights-btn").addEventListener("click", generateAIInsights);

    // CSV Download
    document.getElementById("download-csv-btn").addEventListener("click", downloadExpensesCSV);

    // PDF Download
    document.getElementById("download-pdf-btn").addEventListener("click", downloadExpensesPDF);

    // Quote Shuffle Button
    const shuffleBtn = document.getElementById("shuffle-quote-btn");
    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", displayRandomQuote);
    }
}

// Set default value for new expense date input to today
function setTodayDateInput() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("exp-date").value = today;

    // Set Sidebar date header
    const options = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    document.getElementById("today-date").textContent = new Date().toLocaleDateString('en-US', options);
}

// Toast Notifications System
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    // Close button handler
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Page Routing / Visibility helpers
function showAuthPage(pageName) {
    document.body.className = "auth-layout";
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("dashboard-container").classList.add("hidden");

    // Hide all cards, then show targeted one
    const cards = ["login-card", "signup-card", "forgot-card", "reset-card"];
    cards.forEach(id => document.getElementById(id).classList.add("hidden"));
    document.getElementById(`${pageName}-card`).classList.remove("hidden");
}

function showDashboard() {
    document.body.className = "";
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("dashboard-container").classList.remove("hidden");

    if (currentUser) {
        document.getElementById("user-email").textContent = currentUser.email;
        document.getElementById("settings-user-email").textContent = currentUser.email;
        loadExpenses();
        displayRandomQuote();
    }
    initTheme();
}

// --- SETTINGS: PASSWORD CHANGE WITH OLD PASSWORD VERIFICATION ---

async function handleSettingsPasswordChange(e) {
    e.preventDefault();
    const oldPassword = document.getElementById("settings-old-pass").value;
    const newPassword = document.getElementById("settings-new-pass").value;
    const confirmPassword = document.getElementById("settings-confirm-pass").value;

    if (newPassword !== confirmPassword) {
        showToast("New passwords do not match.", "danger");
        return;
    }
    if (newPassword.length < 6) {
        showToast("New password must be at least 6 characters.", "danger");
        return;
    }

    try {
        // Step 1: Verify old password by re-authenticating
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: currentUser.email,
            password: oldPassword
        });
        if (signInError) {
            showToast("Current password is incorrect.", "danger");
            return;
        }

        // Step 2: Update to new password
        const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;

        showToast("Password updated successfully! ✅");
        document.getElementById("settings-password-form").reset();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function handleSettingsForgotPassword() {
    if (!currentUser) {
        showToast("You must be logged in.", "danger");
        return;
    }
    try {
        const redirectUrl = window.location.origin + "/callback.html";
        const { error } = await supabaseClient.auth.resetPasswordForEmail(currentUser.email, {
            redirectTo: redirectUrl
        });
        if (error) throw error;
        showToast("Reset link sent to " + currentUser.email + " — check your inbox!", "success");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// --- THEME TOGGLE ---

function initTheme() {
    const saved = localStorage.getItem("expensetracker-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    const toggle = document.getElementById("theme-toggle-input");
    toggle.checked = saved === "dark";
    updateThemeDescription(saved);
}

function handleThemeToggle(e) {
    const theme = e.target.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("expensetracker-theme", theme);
    updateThemeDescription(theme);
}

function updateThemeDescription(theme) {
    const desc = document.getElementById("theme-desc-text");
    desc.textContent = theme === "dark" ? "Dark mode is active" : "Light mode is active";
}

// Page title mapping
const PAGE_TITLES = {
    'dashboard': 'Dashboard',
    'add-expense': 'Add Expense',
    'analytics': 'Analytics',
    'ai-insights': 'AI Insights',
    'settings': 'Settings'
};

// Tab/Page Switching
function switchTab(tabId) {
    // Update Sidebar Nav Links
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Update Page Title
    const titleEl = document.getElementById("page-title");
    if (titleEl && PAGE_TITLES[tabId]) {
        titleEl.textContent = PAGE_TITLES[tabId];
    }

    // Update Tab Panels Visibility
    const panels = document.querySelectorAll(".tab-panel");
    panels.forEach(panel => {
        if (panel.id === `tab-${tabId}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });

    // Refresh charts when analytics page is selected
    if (tabId === "analytics") {
        renderCharts();
    }
}

// Currency Formatting Helper
function formatINR(amount) {
    return "₹" + Number(amount).toLocaleString('en-IN', {
        maximumFractionDigits: 0
    });
}

// Password Visibility Toggle
function togglePassVisibility(btn) {
    const input = btn.previousElementSibling;
    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
        btn.classList.add("visible");
    } else {
        input.type = "password";
        btn.textContent = "👁️";
        btn.classList.remove("visible");
    }
}

// --- AUTHENTICATION FLOW HANDLERS ---

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast("Logged in successfully!");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;

    if (password !== confirm) {
        showToast("Passwords do not match", "danger");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        showToast("Registration successful! Check your email for confirmation.", "warning");
        showAuthPage("login");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;

    try {
        const redirectUrl = window.location.origin + "/callback.html";
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });
        if (error) throw error;
        showToast("Reset link sent! Check your inbox.", "success");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// Detect when arriving via recovery link
function handlePasswordResetLanding() {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
        isRecoveringPassword = true;
        showAuthPage("reset");
        // NOTE: We do NOT clear the hash here immediately,
        // because we need the Supabase client to parse the token first.
        // It will be cleared inside the onAuthStateChange listener once parsed!
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById("reset-password").value;

    try {
        const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast("Password has been reset. Log in with your new password.");
        isRecoveringPassword = false;
        await supabaseClient.auth.signOut();
        showAuthPage("login");
    } catch (err) {
        showToast(err.message, "danger");
    }
}



async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        showToast("Logged out successfully");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// --- DATABASE OPERATIONS ---

async function loadExpenses() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabaseClient
            .from("expenses")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("date", { ascending: false });

        if (error) throw error;

        currentExpenses = data || [];
        updateMetrics(currentExpenses);
        renderExpensesList(currentExpenses);

    } catch (err) {
        console.error("Error loading expenses:", err);
        showToast("Failed to fetch expenses from database.", "danger");
    }
}

async function handleAddExpense(e) {
    e.preventDefault();
    const item = document.getElementById("exp-item").value.trim();
    const amount = parseFloat(document.getElementById("exp-amount").value);
    const category = document.getElementById("exp-category").value;
    const date = document.getElementById("exp-date").value;

    if (!item) {
        showToast("Please enter an item name.", "warning");
        return;
    }
    if (amount <= 0) {
        showToast("Amount must be greater than ₹0.", "warning");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("expenses")
            .insert({
                user_id: currentUser.id,
                item,
                amount,
                category,
                date
            });

        if (error) throw error;

        showToast(`Added: ${item} — ${formatINR(amount)}`);
        document.getElementById("add-expense-form").reset();
        setTodayDateInput();

        // Refresh and return to dashboard
        await loadExpenses();
        switchTab("dashboard");

    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function deleteExpense(expenseId) {
    try {
        const { error } = await supabaseClient
            .from("expenses")
            .delete()
            .eq("id", expenseId);

        if (error) throw error;

        showToast("Expense deleted successfully.");
        await loadExpenses();

        // Also refresh charts if we are on the analytics panel
        if (document.getElementById("tab-analytics").classList.contains("active")) {
            renderCharts();
        }
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// Compute and update Dashboard Metrics
function updateMetrics(expenses) {
    if (expenses.length === 0) {
        document.getElementById("metric-total").textContent = "₹0";
        document.getElementById("metric-month").textContent = "₹0";
        document.getElementById("metric-category").textContent = "None";
        document.getElementById("metric-delta").className = "delta";
        document.getElementById("metric-delta").innerHTML = "";
        return;
    }

    // 1. Total spent
    const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    document.getElementById("metric-total").textContent = formatINR(total);

    // 2. This month vs last month
    const today = new Date();
    const thisMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;

    expenses.forEach(item => {
        const itemMonth = item.date.substring(0, 7); // "YYYY-MM"
        if (itemMonth === thisMonthStr) {
            thisMonthTotal += Number(item.amount);
        } else if (itemMonth === lastMonthStr) {
            lastMonthTotal += Number(item.amount);
        }
    });

    document.getElementById("metric-month").textContent = formatINR(thisMonthTotal);

    // Compute MoM Delta
    const deltaSpan = document.getElementById("metric-delta");
    if (lastMonthTotal > 0) {
        const pct = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
        const sign = pct >= 0 ? "▲" : "▼";
        const cls = pct >= 0 ? "delta-up" : "delta-down";
        deltaSpan.className = `delta ${cls}`;
        deltaSpan.innerHTML = `${sign} ${Math.abs(pct).toFixed(0)}% vs last month`;
    } else {
        deltaSpan.className = "delta";
        deltaSpan.innerHTML = "";
    }

    // 3. Top Category
    const categoryTotals = {};
    expenses.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
    });

    let topCat = "None";
    let maxAmt = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > maxAmt) {
            maxAmt = amt;
            topCat = cat;
        }
    }

    const catStyle = CATEGORY_STYLE[topCat] || { emoji: "📌" };
    document.getElementById("metric-category").innerHTML = `${catStyle.emoji} ${topCat}`;
}

// Render Recent Expenses List
function renderExpensesList(expenses) {
    const container = document.getElementById("recent-expenses-list");
    container.innerHTML = "";

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🪙</div>
                <h3>No expenses yet</h3>
                <p>Use the Add Expense tab to get started</p>
            </div>
        `;
        return;
    }

    // Show top 20 latest
    const displayList = expenses.slice(0, 20);

    displayList.forEach(item => {
        const style = CATEGORY_STYLE[item.category] || { emoji: "📌", bg: "#f1f5f9", fg: "#475569" };
        const card = document.createElement("div");
        card.className = "exp-card";

        card.innerHTML = `
            <div class="exp-left">
                <div class="exp-name">${escapeHTML(item.item)}</div>
                <div class="exp-meta">
                    <span class="cat-pill" style="background-color: ${style.bg}; color: ${style.fg};">
                        ${style.emoji} ${item.category}
                    </span>
                    <span>${item.date}</span>
                </div>
            </div>
            <div class="exp-right">
                <div class="exp-amount">${formatINR(item.amount)}</div>
                <button class="btn-delete" title="Delete expense" onclick="deleteExpense('${item.id}')">🗑</button>
            </div>
        `;

        container.appendChild(card);
    });

    if (expenses.length > 20) {
        const info = document.createElement("p");
        info.className = "form-hint";
        info.textContent = `Showing 20 of ${expenses.length} expenses. Download the full CSV in the Analytics tab.`;
        container.appendChild(info);
    }
}

// HTML Escaping Utility
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- VISUALIZATION & CHARTS ---

function renderCharts() {
    const top5Body = document.getElementById("top-expenses-body");

    if (currentExpenses.length === 0) {
        if (categoryDonutChart) {
            categoryDonutChart.destroy();
            categoryDonutChart = null;
        }
        if (momBarChart) {
            momBarChart.destroy();
            momBarChart = null;
        }
        top5Body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: hsl(var(--text-light))">No expenses recorded yet.</td></tr>`;
        return;
    }

    // 1. Donut Chart Data preparation
    const catMap = {};
    let totalAmt = 0;
    currentExpenses.forEach(e => {
        const cat = e.category || "Other";
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
        totalAmt += Number(e.amount);
    });

    // Sort keys descending by total amount
    const sortedCategories = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);

    const donutLabels = sortedCategories.map(cat => {
        const percentage = ((catMap[cat] / totalAmt) * 100).toFixed(0);
        const style = CATEGORY_STYLE[cat] || { emoji: "📌" };
        return `${style.emoji} ${cat} (${percentage}%)`;
    });
    const donutData = sortedCategories.map(cat => catMap[cat]);
    const donutColors = sortedCategories.map(cat => (CATEGORY_STYLE[cat] || {}).chart || "#94a3b8");

    // Donut Chart initialization
    if (categoryDonutChart) categoryDonutChart.destroy();

    const ctxDonut = document.getElementById("categoryDonutChart").getContext("2d");
    categoryDonutChart = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: donutLabels,
            datasets: [{
                data: donutData,
                backgroundColor: donutColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverBorderWidth: 3,
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        boxHeight: 10,
                        borderRadius: 3,
                        useBorderRadius: true,
                        font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                        color: '#5a5550',
                        padding: 14
                    }
                },
                tooltip: {
                    backgroundColor: '#2D2A26',
                    titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label.split(' (')[0]}: ${formatINR(context.raw)}`;
                        }
                    }
                }
            },
            cutout: '58%',
            spacing: 2
        }
    });

    // 2. Month-over-Month Bar Chart
    const monthlyMap = {};
    currentExpenses.forEach(e => {
        if (!e.date) return;
        const monthKey = e.date.substring(0, 7);
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(e.amount);
    });

    const sortedMonths = Object.keys(monthlyMap).sort().slice(-6);

    // Format month labels as readable ("Jan", "Feb", etc)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const barLabels = sortedMonths.map(m => {
        const parts = m.split('-');
        return monthNames[parseInt(parts[1]) - 1] + " '" + parts[0].slice(2);
    });
    const barData = sortedMonths.map(m => monthlyMap[m]);

    // Warm accent: last bar is terracotta, others are muted sand
    const barColors = barData.map((_, idx) => {
        return idx === barData.length - 1 ? "#c87f3a" : "#e2d5c3";
    });

    if (momBarChart) momBarChart.destroy();

    const ctxBar = document.getElementById("momBarChart").getContext("2d");
    momBarChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                data: barData,
                backgroundColor: barColors,
                borderRadius: 6,
                borderWidth: 0,
                maxBarThickness: 36,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#2D2A26',
                    titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return ` Total: ${formatINR(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: '#ece9e4', drawBorder: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' },
                        color: '#9a9590',
                        callback: value => formatINR(value),
                        maxTicksLimit: 5
                    },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                        color: '#5a5550'
                    },
                    border: { display: false }
                }
            }
        }
    });

    // 3. Top 5 table
    top5Body.innerHTML = "";

    const top5 = [...currentExpenses]
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5);

    top5.forEach((e, idx) => {
        const tr = document.createElement("tr");
        const cat = e.category || "Other";
        const style = CATEGORY_STYLE[cat] || { emoji: "📌" };
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${escapeHTML(e.item)}</strong></td>
            <td>${style.emoji} ${cat}</td>
            <td style="color: hsl(var(--primary)); font-weight: 700;">${formatINR(e.amount)}</td>
            <td>${e.date || "N/A"}</td>
        `;
        top5Body.appendChild(tr);
    });
}

// --- CSV EXPORT ---

function downloadExpensesCSV() {
    if (currentExpenses.length === 0) {
        showToast("No expenses to download.", "warning");
        return;
    }

    // Headers
    let csvContent = "data:text/csv;charset=utf-8,id,item,amount,category,date\n";

    currentExpenses.forEach(e => {
        // Escape commas and quotes in item name
        let cleanItem = e.item.replace(/"/g, '""');
        if (cleanItem.includes(",") || cleanItem.includes('"')) {
            cleanItem = `"${cleanItem}"`;
        }

        csvContent += `${e.id},${cleanItem},${e.amount},${e.category},${e.date}\n`;
    });

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expensetracker_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("CSV Download triggered successfully.");
}

// --- PDF EXPORT ---

function formatINRforPDF(amount) {
    // jsPDF's default font doesn't support the ₹ symbol or emoji —
    // using either corrupts the rest of the text string, so we use "Rs." here instead.
    return "Rs. " + Number(amount).toLocaleString('en-IN', {
        maximumFractionDigits: 0
    });
}

function downloadExpensesPDF() {
    if (currentExpenses.length === 0) {
        showToast("No expenses to download.", "warning");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title — no emoji, jsPDF's default font can't render them
    doc.setFontSize(18);
    doc.text("ExpenseTracker - Expense Report", 14, 20);

    // Subtitle with generation date + summary
    const total = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 27);
    doc.text(`Total: ${formatINRforPDF(total)} | ${currentExpenses.length} expenses`, 14, 33);

    // Table of all expenses, most recent first
    const sorted = [...currentExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    const rows = sorted.map(e => [
        e.date || "N/A",
        e.item,
        e.category || "Other",
        formatINRforPDF(e.amount)
    ]);

    doc.autoTable({
        startY: 40,
        head: [["Date", "Item", "Category", "Amount"]],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [200, 127, 58] },
        styles: { fontSize: 9 }
    });

    doc.save("expensetracker_report.pdf");
    showToast("PDF Download triggered successfully.");
}

// Markdown Formatter Utility for AI Insights
function formatMarkdown(text) {
    let html = text
        .replace(/(?:📈|📊)?\s*\*\*Spending Trends\*\*[:\s]*/gi, '<h3>📈 Spending Trends</h3>')
        .replace(/(?:🔍|👁️)?\s*\*\*Pattern Insights\*\*[:\s]*/gi, '<h3>🔍 Pattern Insights</h3>')
        .replace(/(?:⚠️|🚨)?\s*\*\*Wasteful or Unusual Spend Alerts\*\*[:\s]*/gi, '<h3>⚠️ Wasteful or Unusual Spend Alerts</h3>')
        .replace(/(?:💡|🌱)?\s*\*\*Smart Recommendations\*\*[:\s]*/gi, '<h3>💡 Smart Recommendations</h3>');

    // Convert bold **text** to strong
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet lists (e.g. * or -)
    html = html.replace(/^\s*[\*\-]\s+(.+)$/gm, '• $1');

    // Convert double and single line breaks
    html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

    return html;
}

// --- AI INSIGHTS STREAMING ---

async function generateAIInsights() {
    const btn = document.getElementById("generate-insights-btn");
    const placeholder = document.getElementById("insight-box-placeholder");
    const resultBox = document.getElementById("insight-box-result");

    if (currentExpenses.length < 3) {
        showToast("Add at least 3 expenses for AI pattern insights.", "warning");
        return;
    }

    // Disable button, show loading
    btn.disabled = true;
    btn.textContent = "Analyzing spending...";

    placeholder.classList.add("hidden");
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = "<div class='insight-icon' style='animation: spin 1s linear infinite'>⌛</div> Analyzing your data...";

    try {
        // Post data to /api/insights
        // Send fields matching schema Expense
        const expensesPayload = currentExpenses.map(e => ({
            id: e.id,
            user_id: e.user_id,
            item: e.item,
            amount: Number(e.amount),
            category: e.category || "Other",
            date: e.date
        }));

        const response = await fetch("/api/insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expensesPayload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Server error generating insights");
        }

        // Reader to stream text response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let markdownText = "";
        resultBox.innerHTML = ""; // Clear loader

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            markdownText += chunk;

            // Format markdown dynamically using regex helper
            resultBox.innerHTML = formatMarkdown(markdownText);
        }

    } catch (err) {
        console.error("AI Insight error:", err);
        showToast(err.message, "danger");
        placeholder.classList.remove("hidden");
        resultBox.classList.add("hidden");
    } finally {
        btn.disabled = false;
        btn.textContent = "✨ Generate Insights";
    }
}

// --- FINANCIAL QUOTES SYSTEM ---
const FINANCE_QUOTES = [
    { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
    { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
    { text: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
    { text: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
    { text: "The quickest way to double your money is to fold it over and put it back in your pocket.", author: "Will Rogers" },
    { text: "Track your spending, not because you want to restrict yourself, but because you want to understand yourself.", author: "Unknown" },
    { text: "He who buys what he does not need steals from himself.", author: "Swedish Proverb" },
    { text: "Every rupee saved is a rupee earned.", author: "Indian Proverb" },
    { text: "Too many people spend money they haven't earned, to buy things they don't want, to impress people they don't like.", author: "Will Rogers" },
    { text: "Do not buy what you do not need, because it is cheap; it will be dear to you.", author: "Thomas Jefferson" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "The safe way to double your money is to fold it over once and put it in your pocket.", author: "Kin Hubbard" }
];

function displayRandomQuote() {
    const quoteTextEl = document.getElementById("dashboard-quote");
    const quoteAuthorEl = document.getElementById("dashboard-quote-author");
    if (!quoteTextEl || !quoteAuthorEl) return;

    // Smooth transition
    quoteTextEl.style.opacity = "0";
    quoteAuthorEl.style.opacity = "0";

    setTimeout(() => {
        const currentQuote = quoteTextEl.textContent.replace(/^"|"$/g, '');
        // Filter out current quote to ensure we get a new one
        const availableQuotes = FINANCE_QUOTES.filter(q => q.text !== currentQuote);
        const quotesPool = availableQuotes.length > 0 ? availableQuotes : FINANCE_QUOTES;

        const randomIndex = Math.floor(Math.random() * quotesPool.length);
        const quote = quotesPool[randomIndex];

        quoteTextEl.textContent = `"${quote.text}"`;
        quoteAuthorEl.textContent = `— ${quote.author}`;

        quoteTextEl.style.opacity = "1";
        quoteAuthorEl.style.opacity = "1";
    }, 200);
}