# database.py — Supabase DB helpers for SpendSense

import os
import pandas as pd
import streamlit as st
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

_COLUMNS = ["id", "user_id", "item", "amount", "category", "date"]


def _client(session=None):
    if session:
        supabase.auth.set_session(session.access_token, session.refresh_token)
    return supabase


# ── Read ───────────────────────────────────────────────────────────────────────

@st.cache_data(ttl=30, show_spinner=False)
def load_expenses(user_id: str, _session_token: str | None = None) -> pd.DataFrame:
    """
    Load all expenses for *user_id*.

    _session_token is passed only to bust the cache when the session rotates;
    the actual session object is retrieved from st.session_state inside so the
    cached result is keyed correctly without pickling the whole session object.
    """
    session = st.session_state.get("session")
    client  = _client(session)
    res = (
        client.table("expenses")
        .select("*")
        .eq("user_id", str(user_id))
        .order("date", desc=True)
        .execute()
    )
    if res.data:
        df = pd.DataFrame(res.data)
        df["date"]   = pd.to_datetime(df["date"]).dt.date
        df["amount"] = df["amount"].astype(float)
        return df[_COLUMNS]
    return pd.DataFrame(columns=_COLUMNS)


def invalidate_cache(user_id: str):
    """Clear the expense cache so the next load fetches fresh data."""
    load_expenses.clear()


# ── Write ──────────────────────────────────────────────────────────────────────

def add_expense(user_id, item, amount, category, date, session=None):
    _client(session).table("expenses").insert({
        "user_id":  str(user_id),
        "item":     item,
        "amount":   float(amount),
        "category": category,
        "date":     str(date),
    }).execute()
    load_expenses.clear()


def delete_expense(expense_id, session=None):
    _client(session).table("expenses").delete().eq("id", expense_id).execute()
    load_expenses.clear()