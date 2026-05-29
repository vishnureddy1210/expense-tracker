# app.py — SpendSense v2
# Tabs: Dashboard | Add Expense | Analytics | AI Insights

import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
from datetime import date

from auth      import (login_page, signup_page, forgot_password_page,
                       set_new_password_page, logout, change_password_ui)
from database  import load_expenses, add_expense, delete_expense
from utils     import APP_STYLES, CATEGORIES, CATEGORY_STYLE, cat_pill, fmt_inr
from analytics import render_analytics_tab
from insights  import render_insights_tab

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(page_title="SpendSense", page_icon="💸", layout="centered")

# ── Session defaults ───────────────────────────────────────────────────────────
for key, default in [("user", None), ("session", None), ("auth_page", "login")]:
    if key not in st.session_state:
        st.session_state[key] = default

# ── Recovery token check (from query params) ───────────────────────────────────
# This works when the user lands via the /callback redirect page (callback.html)
# which converts the # hash into proper ?query_params Streamlit can read.
_qp = st.query_params
if _qp.get("type", "") == "recovery" and _qp.get("access_token", ""):
    set_new_password_page(
        _qp.get("access_token", ""),
        _qp.get("refresh_token", "")
    )
    st.stop()

# ── Auth gate ──────────────────────────────────────────────────────────────────
if st.session_state.user is None:
    page_map = {"forgot": forgot_password_page, "signup": signup_page}
    page_map.get(st.session_state.auth_page, login_page)()
    st.stop()

# ══════════════════════════════════════════════════════════════════════════════
#  Logged-in area
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(APP_STYLES, unsafe_allow_html=True)

user    = st.session_state.user
uid     = user.id
session = st.session_state.get("session")
token   = session.access_token if session else None

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(
        f"<div style='padding:1.25rem 0 0.5rem;'>"
        f"<div style='font-size:1.4rem;font-weight:700;'>💸 SpendSense</div>"
        f"<div style='font-size:0.78rem;color:#7c7f8e;margin-top:3px;'>{user.email}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )
    st.divider()
    with st.expander("🔒 Change password"):
        change_password_ui(session)
    st.markdown("<div style='height:0.5rem'></div>", unsafe_allow_html=True)
    if st.button("Log out", use_container_width=True):
        logout()
        st.rerun()

# ── Page header ────────────────────────────────────────────────────────────────
today_str = date.today().strftime("%A, %d %b %Y")
st.markdown(
    f"<div style='padding:0.5rem 0 0.75rem;'>"
    f"<div style='font-size:1.4rem;font-weight:700;color:#1a1a2e;'>My Expenses</div>"
    f"<div style='font-size:0.78rem;color:#a0a4b0;margin-top:2px;'>{today_str}</div>"
    f"</div>",
    unsafe_allow_html=True,
)

# ── Load data (cached) ─────────────────────────────────────────────────────────
df = load_expenses(str(uid), _session_token=token)

# ── Tabs ───────────────────────────────────────────────────────────────────────
tab_dash, tab_add, tab_analytics, tab_insights = st.tabs(
    ["📊 Dashboard", "➕ Add Expense", "📈 Analytics", "🤖 AI Insights"]
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 1 — Dashboard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab_dash:
    if df.empty:
        st.markdown(
            "<div style='text-align:center;padding:3.5rem 1rem;color:#a0a4b0;'>"
            "<div style='font-size:2.5rem;'>🪙</div>"
            "<div style='font-size:1rem;font-weight:600;margin-top:0.5rem;color:#7c7f8e;'>No expenses yet</div>"
            "<div style='font-size:0.82rem;margin-top:0.2rem;'>Use the ➕ Add Expense tab to get started</div>"
            "</div>",
            unsafe_allow_html=True,
        )
    else:
        st.markdown("<div class='section-label'>Overview</div>", unsafe_allow_html=True)

        total   = df["amount"].sum()
        top_cat = df.groupby("category")["amount"].sum().idxmax()
        top_emoji = CATEGORY_STYLE.get(top_cat, ("📌",))[0]

        df_copy         = df.copy()
        df_copy["date"] = pd.to_datetime(df_copy["date"])
        this_m     = date.today().strftime("%Y-%m")
        prev_m     = (date.today().replace(day=1) - pd.DateOffset(months=1)).strftime("%Y-%m")
        this_total = df_copy[df_copy["date"].dt.strftime("%Y-%m") == this_m]["amount"].sum()
        prev_total = df_copy[df_copy["date"].dt.strftime("%Y-%m") == prev_m]["amount"].sum()

        if prev_total > 0:
            delta_pct  = (this_total - prev_total) / prev_total * 100
            delta_sign = "▲" if delta_pct > 0 else "▼"
            delta_cls  = "delta-up" if delta_pct > 0 else "delta-down"
            delta_html = (
                f"<div class='delta {delta_cls}'>"
                f"{delta_sign} {abs(delta_pct):.0f}% vs last month</div>"
            )
        else:
            delta_html = ""

        c1, c2, c3 = st.columns(3)
        with c1:
            st.markdown(
                f"<div class='metric-card'>"
                f"<div class='label'>Total Spent</div>"
                f"<div class='value accent'>{fmt_inr(total)}</div>"
                f"{delta_html}</div>",
                unsafe_allow_html=True,
            )
        with c2:
            st.markdown(
                f"<div class='metric-card'>"
                f"<div class='label'>This Month</div>"
                f"<div class='value'>{fmt_inr(this_total)}</div></div>",
                unsafe_allow_html=True,
            )
        with c3:
            st.markdown(
                f"<div class='metric-card'>"
                f"<div class='label'>Top Category</div>"
                f"<div class='value' style='font-size:1.1rem;'>{top_emoji} {top_cat}</div></div>",
                unsafe_allow_html=True,
            )

        st.markdown("<div class='section-label'>Recent Expenses</div>", unsafe_allow_html=True)

        for _, row in df.head(20).iterrows():
            col_card, col_del = st.columns([11, 1])
            with col_card:
                st.markdown(
                    f"<div class='exp-card'>"
                    f"<div class='exp-left'>"
                    f"<div class='exp-name'>{row['item']}</div>"
                    f"<div class='exp-meta'>{cat_pill(row['category'])}&nbsp;{row['date']}</div>"
                    f"</div>"
                    f"<div class='exp-amount'>{fmt_inr(row['amount'])}</div>"
                    f"</div>",
                    unsafe_allow_html=True,
                )
            with col_del:
                st.markdown("<div style='margin-top:10px'></div>", unsafe_allow_html=True)
                if st.button("🗑", key=f"del_{row['id']}", help="Delete expense"):
                    delete_expense(row["id"], session=session)
                    st.rerun()

        if len(df) > 20:
            st.caption(f"Showing 20 of {len(df)} expenses. Download the full CSV in the Analytics tab.")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 2 — Add Expense
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab_add:
    st.markdown("<div class='section-label'>New expense</div>", unsafe_allow_html=True)

    with st.form("add_form", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)
        item      = c1.text_input("Item", placeholder="e.g. Lunch")
        amt       = c2.number_input("Amount (₹)", min_value=0.0, step=10.0)
        cat       = c3.selectbox("Category", CATEGORIES)
        exp_date  = st.date_input("Date", value=date.today())
        submitted = st.form_submit_button("Add Expense ➕", use_container_width=True)

        if submitted:
            if not item.strip():
                st.warning("Please enter an item name.")
            elif amt <= 0:
                st.warning("Amount must be greater than ₹0.")
            else:
                add_expense(uid, item.strip(), amt, cat, exp_date, session=session)
                st.success(f"✅ Added: **{item}** — {fmt_inr(amt)}")
                st.rerun()

    st.markdown(
        "<p style='font-size:0.78rem;color:#a0a4b0;margin-top:0.75rem;'>"
        "💡 You can log past expenses too — just change the Date field.</p>",
        unsafe_allow_html=True,
    )

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 3 — Analytics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab_analytics:
    render_analytics_tab(df)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TAB 4 — AI Insights
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with tab_insights:
    render_insights_tab(df)