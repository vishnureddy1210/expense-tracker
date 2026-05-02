import streamlit as st
from auth import login_page, logout
from database import load_expenses, add_expense, delete_expense
import pandas as pd
import matplotlib.pyplot as plt
from datetime import date

st.set_page_config(page_title="Expense Tracker", page_icon="💰", layout="centered")

# --- Auth gate ---
if "user" not in st.session_state:
    st.session_state.user = None

if st.session_state.user is None:
    login_page()
    st.stop()

user    = st.session_state.user
uid     = user.id
session = st.session_state.get("session")

# --- Header ---
col1, col2 = st.columns([4,1])
col1.title("💰 My Expense Tracker")
if col2.button("Logout"):
    logout()
    st.rerun()

# --- Add expense form ---
with st.form("add_form", clear_on_submit=True):
    c1, c2, c3 = st.columns(3)
    item = c1.text_input("Item")
    amt  = c2.number_input("Amount (₹)", min_value=0.0, step=10.0)
    cat  = c3.selectbox("Category",
           ["Food","Travel","Bills","Shopping","Entertainment","Other"])
    exp_date = st.date_input("Date", value=date.today())
    if st.form_submit_button("Add Expense") and item:
        add_expense(uid, item, amt, cat, exp_date, session=session)
        st.success(f"Saved: {item}")

# --- Load and show data ---
df = load_expenses(uid, session=session)

if not df.empty:
    c1,c2,c3 = st.columns(3)
    c1.metric("Total Spent",   f"₹{df['amount'].sum():.2f}")
    c2.metric("Total Entries", len(df))
    c3.metric("Top Category",
        df.groupby("category")["amount"].sum().idxmax())

    st.subheader("All Expenses")
    for _, row in df.iterrows():
        a,b,c,d,e = st.columns([3,2,2,2,1])
        a.write(row["item"]); b.write(row["category"])
        c.write(f"₹{row['amount']:.0f}"); d.write(row["date"])
        if e.button("🗑", key=str(row["id"])):
            delete_expense(row["id"], session=session)
            st.rerun()

    st.subheader("Spending by Category")
    chart = df.groupby("category")["amount"].sum()
    fig, ax = plt.subplots(figsize=(7,3))
    chart.plot(kind="bar", ax=ax, color="#378ADD", edgecolor="none")
    ax.set_ylabel("Amount (₹)"); plt.xticks(rotation=30, ha="right")
    plt.tight_layout(); st.pyplot(fig)

    st.download_button("Download CSV",
        df.to_csv(index=False), "expenses.csv", "text/csv")
else:
    st.info("No expenses yet. Add your first one above!")