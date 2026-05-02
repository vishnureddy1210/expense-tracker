import streamlit as st
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def login_page():
    st.title("💰 Expense Tracker")
    tab1, tab2 = st.tabs(["Login", "Sign Up"])

    with tab1:
        st.subheader("Log in to your account")
        email    = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_pass")
        if st.button("Log in"):
            try:
                res = supabase.auth.sign_in_with_password(
                    {"email": email, "password": password})
                st.session_state.user    = res.user
                st.session_state.session = res.session  # ← store session
                st.rerun()
            except Exception as e:
                st.error("Login failed. Check your email and password.")

    with tab2:
        st.subheader("Create a new account")
        email    = st.text_input("Email", key="signup_email")
        password = st.text_input("Password (min 6 chars)",
                   type="password", key="signup_pass")
        if st.button("Sign Up"):
            try:
                res = supabase.auth.sign_up(
                    {"email": email, "password": password})
                st.success("Account created! Check email to verify, then log in.")
            except Exception as e:
                st.error(f"Signup failed: {e}")

def logout():
    supabase.auth.sign_out()
    st.session_state.user    = None
    st.session_state.session = None