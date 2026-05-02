from supabase import create_client
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_client(session=None):
    if session:
        supabase.auth.set_session(session.access_token, session.refresh_token)
    return supabase

def load_expenses(user_id: str, session=None) -> pd.DataFrame:
    client = get_client(session)
    res = (client.table("expenses")
           .select("*")
           .eq("user_id", str(user_id))
           .order("date", desc=True)
           .execute())
    if res.data:
        return pd.DataFrame(res.data)
    return pd.DataFrame(
        columns=["id","user_id","item","amount","category","date"])

def add_expense(user_id, item, amount, category, date, session=None):
    client = get_client(session)
    client.table("expenses").insert({
        "user_id":  str(user_id),
        "item":     item,
        "amount":   float(amount),
        "category": category,
        "date":     str(date)
    }).execute()

def delete_expense(expense_id, session=None):
    client = get_client(session)
    client.table("expenses").delete().eq("id", expense_id).execute()