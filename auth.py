import streamlit as st
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Shared styles ──────────────────────────────────────────────────────────────
STYLES = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    background-color: #f5f7fa !important;
    color: #1a1a2e !important;
}
#MainMenu, footer, header { visibility: hidden; }

div[data-testid="stTextInput"] label {
    font-size: 0.82rem !important;
    font-weight: 600 !important;
    color: #4a4e6a !important;
    letter-spacing: 0.03em;
}
div[data-testid="stTextInput"] input {
    border-radius: 10px !important;
    border: 1.5px solid #e0e3ee !important;
    background: #fafbff !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-size: 0.9rem !important;
    color: #1a1a2e !important;
}
div[data-testid="stTextInput"] input:focus {
    border-color: #5b6af0 !important;
    box-shadow: 0 0 0 3px rgba(91,106,240,0.12) !important;
}
div[data-testid="stButton"] > button {
    background: #5b6af0 !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 10px !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.9rem !important;
    width: 100% !important;
    transition: background 0.2s !important;
}
div[data-testid="stButton"] > button:hover { background: #4755d8 !important; }
.stAlert { border-radius: 10px !important; }
</style>
"""

def _inject_styles():
    st.markdown(STYLES, unsafe_allow_html=True)

def _centered_col():
    return st.columns([1, 2, 1])[1]

def _page_header(icon, title, subtitle):
    st.markdown(
        f"<div style='text-align:center;padding:2rem 0 0.5rem;'>"
        f"<div style='font-size:2.5rem;'>{icon}</div>"
        f"<h2 style='font-weight:700;margin:0.3rem 0 0;color:#1a1a2e;'>{title}</h2>"
        f"<p style='color:#7c7f8e;font-size:0.85rem;margin:0.25rem 0 1.5rem;'>{subtitle}</p>"
        f"</div>", unsafe_allow_html=True
    )

def _divider_text(text):
    st.markdown(
        f"<p style='text-align:center;color:#7c7f8e;font-size:0.83rem;margin:0.75rem 0 0.4rem;'>{text}</p>",
        unsafe_allow_html=True
    )


# ── Login ──────────────────────────────────────────────────────────────────────
def login_page():
    _inject_styles()
    with _centered_col():
        _page_header("💸", "SpendSense", "Track every rupee, stress-free")
        email    = st.text_input("Email address", placeholder="you@college.edu", key="login_email")
        password = st.text_input("Password", type="password", placeholder="Enter your password", key="login_pass")

        if st.button("Log in", key="login_btn", use_container_width=True):
            if not email or not password:
                st.warning("Please enter your email and password.")
            else:
                try:
                    res = supabase.auth.sign_in_with_password({"email": email, "password": password})
                    st.session_state.user    = res.user
                    st.session_state.session = res.session
                    st.rerun()
                except Exception as e:
                    err = str(e).lower()
                    if "invalid" in err or "credentials" in err or "password" in err:
                        st.error("❌ Incorrect email or password. Please try again.")
                    elif "email not confirmed" in err:
                        st.warning("📧 Please verify your email first. Check your inbox for the confirmation link.")
                    else:
                        st.error(f"❌ Login failed: {e}")

        _divider_text("")
        if st.button("Forgot password?", key="go_forgot", use_container_width=True):
            st.session_state.auth_page = "forgot"
            st.rerun()

        _divider_text("Don't have an account?")
        if st.button("Create a free account →", key="go_signup", use_container_width=True):
            st.session_state.auth_page = "signup"
            st.rerun()


# ── Sign up ────────────────────────────────────────────────────────────────────
def signup_page():
    _inject_styles()
    with _centered_col():
        _page_header("✨", "Create account", "Join SpendSense — it's free")
        email    = st.text_input("Email address", placeholder="you@college.edu", key="signup_email")
        password = st.text_input("Password", type="password", placeholder="At least 6 characters", key="signup_pass")
        confirm  = st.text_input("Confirm password", type="password", placeholder="Repeat your password", key="signup_confirm")

        if st.button("Sign up", key="signup_btn", use_container_width=True):
            if not email or not password or not confirm:
                st.warning("Please fill in all fields.")
            elif len(password) < 6:
                st.warning("Password must be at least 6 characters.")
            elif password != confirm:
                st.error("❌ Passwords don't match.")
            else:
                try:
                    supabase.auth.sign_up({"email": email, "password": password})
                    st.success("✅ Account created! Check your email to verify, then log in.")
                    st.session_state.auth_page = "login"
                    st.rerun()
                except Exception as e:
                    err = str(e).lower()
                    if "already registered" in err or "already exists" in err:
                        st.error("❌ An account with this email already exists. Try logging in.")
                    else:
                        st.error(f"❌ Signup failed: {e}")

        _divider_text("Already have an account?")
        if st.button("← Back to login", key="go_login", use_container_width=True):
            st.session_state.auth_page = "login"
            st.rerun()


# ── Forgot password ────────────────────────────────────────────────────────────
def forgot_password_page():
    _inject_styles()
    with _centered_col():
        _page_header("🔑", "Forgot password?", "We'll send a reset link to your email")
        email = st.text_input("Email address", placeholder="you@college.edu", key="forgot_email")

        if st.button("Send reset link", key="send_reset_btn", use_container_width=True):
            if not email:
                st.warning("Please enter your email address.")
            else:
                try:
                    redirect_url = os.getenv("SITE_URL", "http://localhost:8501")
                    supabase.auth.reset_password_for_email(
                        email,
                        options={"redirect_to": redirect_url}
                    )
                    st.success("✅ If that email is registered, a reset link has been sent. Check your inbox (and spam folder).")
                except Exception as e:
                    st.error(f"❌ Could not send reset email: {e}")

        _divider_text("Remembered it?")
        if st.button("← Back to login", key="forgot_back", use_container_width=True):
            st.session_state.auth_page = "login"
            st.rerun()


# ── Set new password (lands here after clicking the reset email link) ──────────
def set_new_password_page(access_token: str, refresh_token: str):
    _inject_styles()
    with _centered_col():
        _page_header("🔒", "Set new password", "Choose a strong new password")

        # Establish the recovery session once and store it
        if not st.session_state.get("recovery_session_set"):
            try:
                res = supabase.auth.set_session(access_token, refresh_token)
                st.session_state.recovery_session     = res.session
                st.session_state.recovery_session_set = True
            except Exception as e:
                st.error("❌ This reset link has expired or is invalid. Please request a new one.")
                _divider_text("")
                if st.button("← Request new link", key="rp_back_err", use_container_width=True):
                    st.query_params.clear()
                    st.session_state.pop("recovery_session_set", None)
                    st.session_state.auth_page = "forgot"
                    st.rerun()
                return

        new_pass     = st.text_input("New password", type="password",
                                     placeholder="At least 6 characters", key="rp_new")
        confirm_pass = st.text_input("Confirm password", type="password",
                                     placeholder="Repeat password", key="rp_confirm")

        if st.button("Update password", key="rp_submit", use_container_width=True):
            if not new_pass or not confirm_pass:
                st.warning("Please fill in both fields.")
            elif len(new_pass) < 6:
                st.warning("Password must be at least 6 characters.")
            elif new_pass != confirm_pass:
                st.error("❌ Passwords don't match.")
            else:
                try:
                    sess = st.session_state.recovery_session
                    supabase.auth.set_session(sess.access_token, sess.refresh_token)
                    supabase.auth.update_user({"password": new_pass})

                    # Clean up recovery state
                    for k in ("recovery_session", "recovery_session_set"):
                        st.session_state.pop(k, None)
                    st.query_params.clear()

                    st.success("✅ Password updated! You can now log in with your new password.")
                    _divider_text("")
                    if st.button("Go to login →", key="rp_done", use_container_width=True):
                        st.session_state.auth_page = "login"
                        st.rerun()
                except Exception as e:
                    st.error(f"❌ Failed to update password: {e}")


# ── Change password (sidebar widget, already logged in) ───────────────────────
def change_password_ui(session):
    st.markdown("##### Change Password")
    new_pass     = st.text_input("New password", type="password", key="new_pass",
                                 placeholder="At least 6 characters")
    confirm_pass = st.text_input("Confirm password", type="password", key="confirm_pass",
                                 placeholder="Repeat password")
    if st.button("Update password", key="update_pass_btn", use_container_width=True):
        if not new_pass or not confirm_pass:
            st.warning("Please fill in both fields.")
        elif len(new_pass) < 6:
            st.warning("Password must be at least 6 characters.")
        elif new_pass != confirm_pass:
            st.error("❌ Passwords don't match.")
        else:
            try:
                supabase.auth.set_session(session.access_token, session.refresh_token)
                supabase.auth.update_user({"password": new_pass})
                st.success("✅ Password updated successfully!")
            except Exception as e:
                st.error(f"❌ Failed: {e}")


# ── Logout ─────────────────────────────────────────────────────────────────────
def logout():
    try:
        supabase.auth.sign_out()
    except Exception:
        pass  # Sign out even if session already expired
    st.session_state.user      = None
    st.session_state.session   = None
    st.session_state.auth_page = "login"