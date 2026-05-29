# utils.py — shared constants, helpers, and styles for SpendSense

CATEGORY_STYLE = {
    "Food":          ("🍜", "#fff3e0", "#b45309"),
    "Travel":        ("✈️",  "#e0f2fe", "#0369a1"),
    "Bills":         ("🧾", "#f0fdf4", "#15803d"),
    "Shopping":      ("🛍️", "#fdf4ff", "#7e22ce"),
    "Entertainment": ("🎬", "#fef2f2", "#b91c1c"),
    "Other":         ("📌", "#f1f5f9", "#475569"),
}

CATEGORIES = list(CATEGORY_STYLE.keys())

# Pastel palette for charts (maps to category order)
CHART_COLORS = {
    "Food":          "#fdba74",
    "Travel":        "#7dd3fc",
    "Bills":         "#86efac",
    "Shopping":      "#e879f9",
    "Entertainment": "#fca5a5",
    "Other":         "#94a3b8",
}


def cat_pill(cat: str) -> str:
    """Return an HTML pill badge for a category."""
    emoji, bg, fg = CATEGORY_STYLE.get(cat, ("📌", "#f1f5f9", "#475569"))
    return (
        f'<span style="display:inline-block;padding:2px 9px;border-radius:99px;'
        f'font-size:0.68rem;font-weight:700;letter-spacing:0.04em;'
        f'background:{bg};color:{fg};">{emoji} {cat}</span>'
    )


def fmt_inr(amount: float) -> str:
    """Format a number as Indian Rupees with comma separators."""
    return f"₹{amount:,.0f}"


APP_STYLES = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    background-color: #f5f7fa !important;
    color: #1a1a2e !important;
}
#MainMenu, footer { visibility: hidden; }

/* ── Section labels ── */
.section-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    color: #a0a4b0;
    text-transform: uppercase;
    margin: 1.75rem 0 0.6rem;
}

/* ── Metric cards ── */
.metric-card {
    background: #ffffff;
    border: 1px solid #e8eaf0;
    border-radius: 14px;
    padding: 1rem 1.1rem;
    transition: box-shadow 0.2s;
}
.metric-card:hover { box-shadow: 0 4px 16px rgba(91,106,240,0.08); }
.metric-card .label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #a0a4b0;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 0.3rem;
}
.metric-card .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a2e;
    line-height: 1;
}
.metric-card .value.accent  { color: #5b6af0; }
.metric-card .value.green   { color: #15803d; }
.metric-card .value.amber   { color: #b45309; }
.metric-card .delta {
    font-size: 0.72rem;
    font-weight: 600;
    margin-top: 0.3rem;
}
.delta-up   { color: #b91c1c; }
.delta-down { color: #15803d; }
.delta-flat { color: #a0a4b0; }

/* ── Expense row cards ── */
.exp-card {
    background: #ffffff;
    border: 1px solid #e8eaf0;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    transition: box-shadow 0.15s;
}
.exp-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.exp-left  { flex: 1; min-width: 0; }
.exp-name  {
    font-size: 0.92rem;
    font-weight: 600;
    color: #1a1a2e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.exp-meta   { font-size: 0.75rem; color: #a0a4b0; margin-top: 2px; }
.exp-amount { font-size: 1rem; font-weight: 700; color: #1a1a2e; white-space: nowrap; }

/* ── AI insight box ── */
.insight-box {
    background: linear-gradient(135deg, #f0f1fe 0%, #fdf4ff 100%);
    border: 1px solid #d0d3f8;
    border-radius: 16px;
    padding: 1.25rem 1.4rem;
    margin-bottom: 0.75rem;
    line-height: 1.65;
    font-size: 0.9rem;
    color: #1a1a2e;
}
.insight-header {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #5b6af0;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
}

/* ── Forms ── */
div[data-testid="stForm"] {
    background: #ffffff !important;
    border: 1px solid #e8eaf0 !important;
    border-radius: 16px !important;
    padding: 1.25rem 1.25rem 0.75rem !important;
}
div[data-testid="stTextInput"] label,
div[data-testid="stNumberInput"] label,
div[data-testid="stSelectbox"] label,
div[data-testid="stDateInput"] label {
    font-size: 0.78rem !important;
    font-weight: 600 !important;
    color: #4a4e6a !important;
}
div[data-testid="stTextInput"] input,
div[data-testid="stNumberInput"] input {
    border-radius: 9px !important;
    border: 1.5px solid #e0e3ee !important;
    background: #fafbff !important;
    font-size: 0.88rem !important;
    color: #1a1a2e !important;
}
div[data-testid="stTextInput"] input:focus,
div[data-testid="stNumberInput"] input:focus {
    border-color: #5b6af0 !important;
    box-shadow: 0 0 0 3px rgba(91,106,240,0.10) !important;
}
div[data-testid="stFormSubmitButton"] > button {
    background: #5b6af0 !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-size: 0.88rem !important;
    width: 100% !important;
}
div[data-testid="stFormSubmitButton"] > button:hover { background: #4755d8 !important; }
div[data-testid="stButton"] > button {
    border-radius: 10px !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.85rem !important;
}
div[data-testid="stDownloadButton"] > button {
    background: #f0f1fe !important;
    color: #5b6af0 !important;
    border: 1.5px solid #d0d3f8 !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-size: 0.85rem !important;
    width: 100% !important;
}

/* ── Sidebar ── */
section[data-testid="stSidebar"] {
    background: #ffffff !important;
    border-right: 1px solid #e8eaf0 !important;
}
section[data-testid="stSidebar"] * { color: #1a1a2e !important; }

/* ── Tab bar ── */
button[data-baseweb="tab"] {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.85rem !important;
}

.stAlert { border-radius: 10px !important; }
</style>
"""