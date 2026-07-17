// app.js — ExpenseTracker🔥💰 Upgraded Frontend Controller

// Application State
let supabaseClient = null;
let currentUser = null;
let currentExpenses = [];
let categoryDonutChart = null;
let momBarChart = null;
let isRecoveringPassword = false;

// Filter State
let activeSearchQuery = "";
let activeCategoryFilter = "All";

// AI Chat State
let chatHistory = [];

// Category limits
let categoryBudgets = {
    "Food": 5000,
    "Travel": 2000,
    "Bills": 4000,
    "Shopping": 3000,
    "Entertainment": 1500,
    "Other": 2000
};

// Colors matching accents
const ACCENT_COLORS = {
    "terracotta": "#d97706",
    "indigo": "#6366f1",
    "emerald": "#10b981",
    "amber": "#f59e0b",
    "violet": "#8b5cf6"
};
const ACCENT_MUTED_COLORS = {
    "terracotta": "#e2d5c3",
    "indigo": "#c7d2fe",
    "emerald": "#a7f3d0",
    "amber": "#fde68a",
    "violet": "#ddd6fe"
};

// Constant category styles
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

        // Check for password recovery landing
        handlePasswordResetLanding();

        // Monitor Auth State Changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                isRecoveringPassword = true;
                showAuthPage("reset");
                history.replaceState(null, null, ' '); // Clear hash safely
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

// Setup Form, Preset, Filter, Accent, and Navigation Event Listeners
function setupEventListeners() {
    // Auth Forms
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("signup-form").addEventListener("submit", handleSignup);
    document.getElementById("forgot-form").addEventListener("submit", handleForgotPassword);
    document.getElementById("reset-form").addEventListener("submit", handleResetPassword);

    // Dashboard Actions
    document.getElementById("add-expense-form").addEventListener("submit", handleAddExpense);
    document.getElementById("logout-btn").addEventListener("click", handleLogout);

    // Settings forms
    document.getElementById("settings-password-form").addEventListener("submit", handleSettingsPasswordChange);
    document.getElementById("settings-forgot-btn").addEventListener("click", handleSettingsForgotPassword);
    document.getElementById("theme-toggle-input").addEventListener("change", handleThemeToggle);
    document.getElementById("budget-settings-form").addEventListener("submit", handleBudgetSettingsSave);

    // Sidebar Navigation Toggling
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // AI Insights (Full report)
    document.getElementById("generate-insights-btn").addEventListener("click", generateAIInsights);

    // CSV/PDF Download
    document.getElementById("download-csv-btn").addEventListener("click", downloadExpensesCSV);
    document.getElementById("download-pdf-btn").addEventListener("click", downloadExpensesPDF);

    // Quote Shuffle Button
    const shuffleBtn = document.getElementById("shuffle-quote-btn");
    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", displayRandomQuote);
    }

    // Quick add presets triggers
    const presets = document.querySelectorAll(".amount-presets .btn-preset");
    presets.forEach(btn => {
        btn.addEventListener("click", () => {
            const amountInput = document.getElementById("exp-amount");
            const currentVal = parseFloat(amountInput.value) || 0;
            const addVal = parseFloat(btn.getAttribute("data-amount"));
            amountInput.value = currentVal + addVal;
        });
    });

    // Search and category filter list logic
    const searchInput = document.getElementById("tx-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            activeSearchQuery = e.target.value.toLowerCase().trim();
            applyExpensesFilter();
        });
    }

    const filterPills = document.querySelectorAll("#tx-filter-pills .filter-pill");
    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeCategoryFilter = pill.getAttribute("data-category");
            applyExpensesFilter();
        });
    });

    // AI Chat submission handler
    const chatForm = document.getElementById("ai-chat-form");
    if (chatForm) {
        chatForm.addEventListener("submit", handleAIChatSubmit);
    }

    // AI Chat sidebar suggested chips
    const chips = document.querySelectorAll(".prompt-chip");
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const text = chip.getAttribute("data-prompt");
            const input = document.getElementById("chat-user-input");
            if (input) {
                input.value = text;
                chatForm.dispatchEvent(new Event("submit"));
            }
        });
    });

    // Color theme accent switches
    const accentOptions = document.querySelectorAll(".accent-option");
    accentOptions.forEach(btn => {
        btn.addEventListener("click", () => {
            const accent = btn.getAttribute("data-accent");
            document.documentElement.setAttribute("data-accent", accent);
            localStorage.setItem("expensetracker-accent", accent);

            accentOptions.forEach(o => o.classList.remove("active"));
            btn.classList.add("active");

            showToast(`Accent set to ${accent.toUpperCase()}! ✨`);
            renderBudgetProgress();
            if (document.getElementById("tab-analytics").classList.contains("active")) {
                renderCharts();
            }
        });
    });

    // Smart auto-categorization based on item description keywords
    const expItemInput = document.getElementById("exp-item");
    if (expItemInput) {
        expItemInput.addEventListener("input", (e) => {
            const val = e.target.value;
            const categorySelect = document.getElementById("exp-category");
            if (categorySelect) {
                const prediction = predictCategory(val);
                if (prediction) {
                    categorySelect.value = prediction;
                }
            }
        });
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

// Page Routing helpers
function showAuthPage(pageName) {
    document.body.className = "auth-layout";
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("dashboard-container").classList.add("hidden");

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
        loadBudgetsFromStorage();
        displayRandomQuote();
    }
    initTheme();
    initAccent();
}

// --- COLOR ACCENT AND THEME HANDLERS ---
function initAccent() {
    const saved = localStorage.getItem("expensetracker-accent") || "terracotta";
    document.documentElement.setAttribute("data-accent", saved);

    const options = document.querySelectorAll(".accent-option");
    options.forEach(btn => {
        if (btn.getAttribute("data-accent") === saved) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

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

// Switch between panels
const PAGE_TITLES = {
    'dashboard': 'Dashboard',
    'add-expense': 'Add Expense',
    'analytics': 'Analytics',
    'ai-insights': 'AI Insights',
    'settings': 'Settings'
};

function switchTab(tabId) {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const titleEl = document.getElementById("page-title");
    if (titleEl && PAGE_TITLES[tabId]) {
        titleEl.textContent = PAGE_TITLES[tabId];
    }

    const panels = document.querySelectorAll(".tab-panel");
    panels.forEach(panel => {
        if (panel.id === `tab-${tabId}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });

    if (tabId === "analytics") {
        renderCharts();
    }
}

// Currency format
function formatINR(amount) {
    return "₹" + Number(amount).toLocaleString('en-IN', {
        maximumFractionDigits: 0
    });
}

// Toggle input visibility
function togglePassVisibility(btn) {
    const input = btn.previousElementSibling;
    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
    } else {
        input.type = "password";
        btn.textContent = "👁️";
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
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.8 } });
        showToast("Welcome back! 👋");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        showToast("Registration successful! Check email for verification link.", "warning");
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
        showToast("Reset link sent! Check inbox.", "success");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function handlePasswordResetLanding() {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
        isRecoveringPassword = true;
        showAuthPage("reset");
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById("reset-password").value;

    try {
        const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast("Password updated. Log in again.");
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
        applyExpensesFilter();
        renderBudgetProgress();

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

        // Visual milestone burst
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#D97706', '#10B981', '#6366F1', '#8B5CF6']
        });

        showToast(`Logged: ${item} — ${formatINR(amount)}`);
        document.getElementById("add-expense-form").reset();
        setTodayDateInput();

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

        showToast("Expense deleted.");
        await loadExpenses();

        if (document.getElementById("tab-analytics").classList.contains("active")) {
            renderCharts();
        }
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// Compute Metrics
function updateMetrics(expenses) {
    if (expenses.length === 0) {
        document.getElementById("metric-total").textContent = "₹0";
        document.getElementById("metric-month").textContent = "₹0";
        document.getElementById("metric-category").textContent = "None";
        document.getElementById("metric-delta").innerHTML = "";
        return;
    }

    // 1. Total spent
    const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    document.getElementById("metric-total").textContent = formatINR(total);

    // 2. Month-over-month
    const today = new Date();
    const thisMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let thisMonthTotal = 0;
    let lastMonthTotal = 0;

    expenses.forEach(item => {
        const itemMonth = item.date.substring(0, 7);
        if (itemMonth === thisMonthStr) {
            thisMonthTotal += Number(item.amount);
        } else if (itemMonth === lastMonthStr) {
            lastMonthTotal += Number(item.amount);
        }
    });

    document.getElementById("metric-month").textContent = formatINR(thisMonthTotal);

    // MoM Delta
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

// Render Transactions List with filters
function renderExpensesList(expenses) {
    const container = document.getElementById("recent-expenses-list");
    container.innerHTML = "";

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No matching transactions</h3>
                <p>Try resetting filters or adding a new expense</p>
            </div>
        `;
        return;
    }

    // Show top 25
    const displayList = expenses.slice(0, 25);

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
                <button type="button" class="btn-delete" title="Delete expense" onclick="deleteExpense('${item.id}')">🗑</button>
            </div>
        `;

        container.appendChild(card);
    });

    if (expenses.length > 25) {
        const info = document.createElement("p");
        info.className = "form-hint";
        info.style.textAlign = "center";
        info.textContent = `Showing 25 of ${expenses.length} expenses. Access CSV in Analytics for the full dataset.`;
        container.appendChild(info);
    }
}

function applyExpensesFilter() {
    let filtered = currentExpenses;
    if (activeCategoryFilter !== "All") {
        filtered = filtered.filter(exp => exp.category === activeCategoryFilter);
    }
    if (activeSearchQuery !== "") {
        filtered = filtered.filter(exp => exp.item.toLowerCase().includes(activeSearchQuery));
    }
    renderExpensesList(filtered);
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

// --- VISUALIZATION CHARTS ---
function renderCharts() {
    const top5Body = document.getElementById("top-expenses-body");
    const activeAccent = document.documentElement.getAttribute("data-accent") || "terracotta";
    const accentHex = ACCENT_COLORS[activeAccent] || "#d97706";
    const accentMutedHex = ACCENT_MUTED_COLORS[activeAccent] || "#e2d5c3";

    if (currentExpenses.length === 0) {
        if (categoryDonutChart) { categoryDonutChart.destroy(); categoryDonutChart = null; }
        if (momBarChart) { momBarChart.destroy(); momBarChart = null; }
        top5Body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: hsl(var(--text-light))">No expenses recorded yet.</td></tr>`;
        return;
    }

    // 1. Donut Chart
    const catMap = {};
    let totalAmt = 0;
    currentExpenses.forEach(e => {
        const cat = e.category || "Other";
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
        totalAmt += Number(e.amount);
    });

    const sortedCategories = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]);

    const donutLabels = sortedCategories.map(cat => {
        const percentage = ((catMap[cat] / totalAmt) * 100).toFixed(0);
        const style = CATEGORY_STYLE[cat] || { emoji: "📌" };
        return `${style.emoji} ${cat} (${percentage}%)`;
    });
    const donutData = sortedCategories.map(cat => catMap[cat]);
    const donutColors = sortedCategories.map(cat => (CATEGORY_STYLE[cat] || {}).chart || "#94a3b8");

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
                borderColor: document.documentElement.getAttribute("data-theme") === "dark" ? "#121826" : "#ffffff",
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 8,
                        boxHeight: 8,
                        borderRadius: 3,
                        useBorderRadius: true,
                        font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
                        color: document.documentElement.getAttribute("data-theme") === "dark" ? "#9aa5b5" : "#5a5550",
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#121826',
                    titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (context) => ` ${context.label.split(' (')[0]}: ${formatINR(context.raw)}`
                    }
                }
            },
            cutout: '62%',
            spacing: 2
        }
    });

    // 2. Bar Chart
    const monthlyMap = {};
    currentExpenses.forEach(e => {
        if (!e.date) return;
        const monthKey = e.date.substring(0, 7);
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(e.amount);
    });

    const sortedMonths = Object.keys(monthlyMap).sort().slice(-6);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const barLabels = sortedMonths.map(m => {
        const parts = m.split('-');
        return monthNames[parseInt(parts[1]) - 1] + " '" + parts[0].slice(2);
    });
    const barData = sortedMonths.map(m => monthlyMap[m]);

    // Color matching: active theme colors
    const barColors = barData.map((_, idx) => {
        return idx === barData.length - 1 ? accentHex : accentMutedHex;
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
                maxBarThickness: 32,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#121826',
                    titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (context) => ` Spent: ${formatINR(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: document.documentElement.getAttribute("data-theme") === "dark" ? "#222a3d" : "#ece9e4", drawBorder: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 9, weight: '500' },
                        color: '#9a9590',
                        callback: value => formatINR(value),
                        maxTicksLimit: 5
                    },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
                        color: document.documentElement.getAttribute("data-theme") === "dark" ? "#9aa5b5" : "#5a5550"
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
            <td style="color: hsl(var(--accent-h), var(--accent-s), var(--accent-l)); font-weight: 700;">${formatINR(e.amount)}</td>
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

    let csvContent = "data:text/csv;charset=utf-8,id,item,amount,category,date\n";

    currentExpenses.forEach(e => {
        let cleanItem = e.item.replace(/"/g, '""');
        if (cleanItem.includes(",") || cleanItem.includes('"')) {
            cleanItem = `"${cleanItem}"`;
        }
        csvContent += `${e.id},${cleanItem},${e.amount},${e.category},${e.date}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expensetracker_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("CSV exported!");
}

// --- PDF EXPORT ---
function formatINRforPDF(amount) {
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

    doc.setFontSize(18);
    doc.text("ExpenseTracker - Expense Report", 14, 20);

    const total = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 27);
    doc.text(`Total: ${formatINRforPDF(total)} | ${currentExpenses.length} expenses`, 14, 33);

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
        headStyles: { fillColor: [99, 102, 241] }, // Indigo fill
        styles: { fontSize: 9 }
    });

    doc.save("expensetracker_report.pdf");
    showToast("PDF exported!");
}

// Markdown formatter utility
function formatMarkdown(text) {
    let html = text
        .replace(/(?:📈|📊)?\s*\*\*Spending Trends\*\*[:\s]*/gi, '<h3>📈 Spending Trends</h3>')
        .replace(/(?:🔍|👁️)?\s*\*\*Pattern Insights\*\*[:\s]*/gi, '<h3>🔍 Pattern Insights</h3>')
        .replace(/(?:⚠️|🚨)?\s*\*\*Wasteful or Unusual Spend Alerts\*\*[:\s]*/gi, '<h3>⚠️ Wasteful Spends</h3>')
        .replace(/(?:💡|🌱)?\s*\*\*Smart Recommendations\*\*[:\s]*/gi, '<h3>💡 Smart Recommendations</h3>');

    // Bold text converter
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet converter
    html = html.replace(/^\s*[\*\-]\s+(.+)$/gm, '• $1');

    // Double/single break updates
    html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

    return html;
}

// --- BUDGET INTERACTIVITY FUNCTIONS ---
function loadBudgetsFromStorage() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`expensetracker-budgets-${currentUser.id}`);
    if (saved) {
        categoryBudgets = JSON.parse(saved);
    } else {
        // Preset defaults
        categoryBudgets = {
            "Food": 5000,
            "Travel": 2000,
            "Bills": 4000,
            "Shopping": 3000,
            "Entertainment": 1500,
            "Other": 2000
        };
    }
    populateBudgetForm();
    renderBudgetProgress();
}

function populateBudgetForm() {
    Object.keys(categoryBudgets).forEach(cat => {
        const input = document.getElementById(`budget-${cat}`);
        if (input) {
            input.value = categoryBudgets[cat] || 0;
        }
    });
}

function handleBudgetSettingsSave(e) {
    e.preventDefault();
    Object.keys(categoryBudgets).forEach(cat => {
        const input = document.getElementById(`budget-${cat}`);
        if (input) {
            categoryBudgets[cat] = Number(input.value) || 0;
        }
    });

    localStorage.setItem(`expensetracker-budgets-${currentUser.id}`, JSON.stringify(categoryBudgets));
    showToast("Monthly budgets updated! 🎯");
    renderBudgetProgress();
}

function renderBudgetProgress() {
    const grid = document.getElementById("dashboard-budgets-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // Accumulate category spends
    const categorySpends = {};
    Object.keys(CATEGORY_STYLE).forEach(cat => categorySpends[cat] = 0);
    
    currentExpenses.forEach(exp => {
        const cat = exp.category || "Other";
        if (categorySpends[cat] !== undefined) {
            categorySpends[cat] += Number(exp.amount);
        } else {
            categorySpends["Other"] += Number(exp.amount);
        }
    });

    Object.keys(CATEGORY_STYLE).forEach(cat => {
        const style = CATEGORY_STYLE[cat];
        const spent = categorySpends[cat] || 0;
        const limit = categoryBudgets[cat] || 0;

        const card = document.createElement("div");
        card.className = "budget-progress-card";

        let percent = 0;
        let progressWidth = 0;
        let statusText = "No limit set";
        let statusClass = "normal";

        if (limit > 0) {
            percent = Math.round((spent / limit) * 100);
            progressWidth = Math.min(percent, 100);
            statusText = `${percent}% used`;
            if (percent >= 100) {
                statusText = "Exceeded 🚨";
                statusClass = "danger";
            } else if (percent >= 85) {
                statusText = "Warning ⚠️";
                statusClass = "warning";
            }
        }

        let barColor = `hsl(var(--accent-h), var(--accent-s), var(--accent-l))`;
        if (statusClass === "warning") barColor = "hsl(var(--warning))";
        if (statusClass === "danger") barColor = "hsl(var(--danger))";

        card.innerHTML = `
            <div class="budget-card-header">
                <span class="budget-emoji">${style.emoji}</span>
                <span class="budget-name">${cat}</span>
            </div>
            <div class="budget-stats">
                <span>Spent: ${formatINR(spent)}</span>
                <span>Limit: ${limit > 0 ? formatINR(limit) : '∞'}</span>
            </div>
            <div class="budget-progress-bar-container">
                <div class="budget-progress-bar" style="width: ${progressWidth}%; background-color: ${barColor}"></div>
            </div>
            <div class="budget-status ${statusClass}">${statusText}</div>
        `;
        grid.appendChild(card);
    });
}

// --- INTERACTIVE AI CHAT ASSISTANT ---
async function handleAIChatSubmit(e) {
    e.preventDefault();
    const inputEl = document.getElementById("chat-user-input");
    const query = inputEl.value.trim();
    if (!query) return;

    inputEl.value = "";
    appendChatMessage("user", query);

    const chatContainer = document.getElementById("chat-messages");
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Show loading indicator
    const loaderId = appendTypingIndicator();
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const payload = {
            expenses: currentExpenses.map(e => ({
                id: e.id,
                user_id: e.user_id,
                item: e.item,
                amount: Number(e.amount),
                category: e.category || "Other",
                date: e.date
            })),
            message: query,
            history: chatHistory
        };

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        removeTypingIndicator(loaderId);

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Server error communicating with AI");
        }

        const aiBubble = appendChatMessage("ai", "");
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let aiResponseText = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            aiResponseText += chunk;

            aiBubble.innerHTML = formatMarkdown(aiResponseText);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        chatHistory.push({ role: "user", content: query });
        chatHistory.push({ role: "assistant", content: aiResponseText });

        if (chatHistory.length > 8) {
            chatHistory = chatHistory.slice(-8); // Keep history size balanced
        }

    } catch (err) {
        console.error("AI chat error:", err);
        removeTypingIndicator(loaderId);
        showToast(err.message, "danger");
        appendChatMessage("ai", "Oops, I encountered an issue while reviewing your expense records. Please try asking again shortly! 🤖");
    }
}

function appendChatMessage(role, content) {
    const container = document.getElementById("chat-messages");
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role === "user" ? "user-msg" : "ai-msg"}`;
    bubble.innerHTML = role === "user" ? escapeHTML(content) : formatMarkdown(content);
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

function appendTypingIndicator() {
    const container = document.getElementById("chat-messages");
    const loader = document.createElement("div");
    const uniqueId = "loader_" + Date.now();
    loader.id = uniqueId;
    loader.className = "chat-bubble ai-msg";
    loader.innerHTML = `
        <div class="typing-loader">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    container.appendChild(loader);
    return uniqueId;
}

function removeTypingIndicator(loaderId) {
    const loader = document.getElementById(loaderId);
    if (loader) {
        loader.remove();
    }
}

// Generate full AI spending insights (original box stream)
async function generateAIInsights() {
    const btn = document.getElementById("generate-insights-btn");
    const chatContainer = document.getElementById("chat-messages");

    if (currentExpenses.length < 3) {
        showToast("Please add at least 3 expenses to allow spending pattern analysis.", "warning");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Analyzing data...";

    const loaderId = appendTypingIndicator();
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
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

        removeTypingIndicator(loaderId);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Server error generating report");
        }

        const reportBubble = appendChatMessage("ai", "");
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let markdownText = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            markdownText += chunk;

            reportBubble.innerHTML = formatMarkdown(markdownText);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

    } catch (err) {
        console.error("AI Insight report error:", err);
        showToast(err.message, "danger");
        removeTypingIndicator(loaderId);
        appendChatMessage("ai", "Apologies, I hit a snag compiling your spending trend report. Please check back in a moment!");
    } finally {
        btn.disabled = false;
        btn.textContent = "📊 Generate Full Report";
    }
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
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" }
];

function displayRandomQuote() {
    const quoteTextEl = document.getElementById("dashboard-quote");
    const quoteAuthorEl = document.getElementById("dashboard-quote-author");
    if (!quoteTextEl || !quoteAuthorEl) return;

    quoteTextEl.style.opacity = "0";
    quoteAuthorEl.style.opacity = "0";

    setTimeout(() => {
        const currentQuote = quoteTextEl.textContent.replace(/^"|"$/g, '');
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

// --- AUTO-CATEGORIZATION UTILITY ---
const CATEGORY_KEYWORDS = {
    "Food": ["food", "lunch", "dinner", "breakfast", "starbucks", "coffee", "restaurant", "mcdonalds", "swiggy", "zomato", "cafe", "tea", "chai", "burger", "pizza", "grocery", "groceries", "snack", "snacks", "drinks", "subway", "kfc", "coke", "pepsi", "baskin", "maggi", "dominos", "dunkin", "eats", "bakery", "sweets"],
    "Travel": ["uber", "ola", "auto", "cab", "metro", "bus", "flight", "ticket", "train", "petrol", "fuel", "diesel", "transport", "travel", "rapido", "ride", "taxi", "toll", "indane", "gasoline", "irctc", "airline", "indigo", "airindia"],
    "Bills": ["rent", "electricity", "water", "wifi", "internet", "recharge", "mobile", "subscription", "netflix", "spotify", "bill", "gas", "insurance", "broadband", "youtube", "postpaid", "dth", "landline", "jio", "airtel", "vi "],
    "Shopping": ["amazon", "flipkart", "myntra", "clothes", "shoes", "tshirt", "jeans", "shopping", "gift", "watch", "electronics", "laptop", "phone", "shirt", "pant", "jacket", "hoodie", "nike", "adidas", "zara", "h&m"],
    "Entertainment": ["movie", "cinema", "theatre", "concert", "game", "gaming", "steam", "playstation", "pubg", "club", "party", "beer", "wine", "pub", "bar", "arcade", "bookmyshow", "disney", "prime video", "hotstar", "zee5", "sony"]
};

function predictCategory(itemName) {
    if (!itemName) return null;
    const text = itemName.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const word of keywords) {
            if (text.includes(word)) {
                return category;
            }
        }
    }
    return null;
}