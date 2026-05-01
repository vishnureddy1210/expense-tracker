import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
from datetime import date

st.set_page_config(page_title="Expense Tracker", page_icon="💰")
st.title("💰 Expense Tracker")

if "expenses" not in st.session_state:
    st.session_state.expenses = []

with st.form("add_form"):
    col1, col2, col3 = st.columns(3)
    with col1: item = st.text_input("Item")
    with col2: amt = st.number_input("Amount (₹)", min_value=0.0)
    with col3: cat = st.selectbox("Category",
        ["Food","Travel","Bills","Shopping","Other"])
    d = st.date_input("Date", value=date.today())
    submitted = st.form_submit_button("Add Expense")
    if submitted and item:
        st.session_state.expenses.append(
            {"Item":item,"Amount":amt,"Category":cat,"Date":str(d)})
        st.success(f"Added: {item}")

if st.session_state.expenses:
    df = pd.DataFrame(st.session_state.expenses)
    st.subheader("All Expenses")
    st.dataframe(df, use_container_width=True)

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Spent", f"₹{df['Amount'].sum():.2f}")
    col2.metric("Entries", len(df))
    col3.metric("Top Category",
        df.groupby('Category')['Amount'].sum().idxmax())

    st.subheader("Spending by Category")
    chart_data = df.groupby("Category")["Amount"].sum()
    fig, ax = plt.subplots()
    chart_data.plot(kind="bar", ax=ax, color="#378ADD")
    ax.set_ylabel("Amount (₹)")
    st.pyplot(fig)

    csv = df.to_csv(index=False)
    st.download_button("Download CSV", csv,
        "expenses.csv", "text/csv")