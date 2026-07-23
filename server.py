# server.py — FastAPI Backend for ExpenseTracker🔥💰

import os
import mimetypes
from datetime import date
from typing import List
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

# Load env variables from .env
load_dotenv()

# Fix: Debian slim Docker images often lack /etc/mime.types,
# which causes Python's mimetypes module to misdetect .js/.css files
# and StaticFiles falls back to "text/plain" — browsers then refuse
# to execute scripts served with the wrong MIME type. Force correct types.
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

app = FastAPI(title="ExpenseTracker🔥💰 Backend", description="APIs for ExpenseTracker🔥💰 expense tracker")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment.")

# Pydantic models for request validation
class Expense(BaseModel):
    id: str
    user_id: str
    item: str
    amount: float
    category: str | None = "Other"
    date: str | None = None


def fmt_inr(amount: float) -> str:
    """Format a number as Indian Rupees with comma separators."""
    return f"₹{amount:,.0f}"

def build_prompt(expenses_list: List[Expense]) -> str:
    """Construct a rich context prompt from the user's expense data."""
    if not expenses_list:
        return ""
        
    today = date.today()
    
    data = []
    for e in expenses_list:
        data.append({
            "id": e.id,
            "user_id": e.user_id,
            "item": e.item,
            "amount": e.amount,
            "category": e.category,
            "date": e.date
        })
        
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])

    df["month"] = df["date"].dt.to_period("M")
    monthly = df.groupby("month")["amount"].sum().tail(3)
    monthly_str = "\n".join(f"  - {m}: {fmt_inr(v)}" for m, v in monthly.items())

    cat_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    cat_str = "\n".join(f"  - {cat}: {fmt_inr(val)}" for cat, val in cat_totals.items())

    top5 = df.nlargest(5, "amount")[["item", "amount", "category", "date"]]
    top5_str = "\n".join(
        f"  - {row['item']} ({row['category']}) on {row['date'].date()}: {fmt_inr(row['amount'])}"
        for _, row in top5.iterrows()
    )

    df["dow"] = df["date"].dt.day_name()
    dow_totals = (
        df.groupby("dow")["amount"]
        .sum()
        .reindex(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"])
        .dropna()
    )
    dow_str = ", ".join(f"{d}: {fmt_inr(v)}" for d, v in dow_totals.items())

    total     = df["amount"].sum()
    avg_daily = df.groupby(df["date"].dt.date)["amount"].sum().mean()

    return f"""You are a friendly, sharp personal finance assistant for an Indian college student.
Analyze the following expense data and produce a concise, insightful report.

=== EXPENSE SUMMARY ===
Total recorded: {fmt_inr(total)}
Average daily spend: {fmt_inr(avg_daily)}
Today: {today.strftime('%d %B %Y')}

Monthly totals (recent):
{monthly_str}

Category breakdown (all time):
{cat_str}

Top 5 largest expenses:
{top5_str}

Day-of-week totals:
{dow_str}

=== INSTRUCTIONS ===
Write a short, friendly analysis (no bullet walls — use short paragraphs with emoji headers).
Structure your response exactly like this:

📈 **Spending Trends**
(2–3 sentences on month-over-month change and whether spending is rising/falling)

🔍 **Pattern Insights**
(2–3 sentences on which days/categories dominate and why that might be)

⚠️ **Wasteful or Unusual Spend Alerts**
(1–2 specific callouts — name actual items/categories from the data that seem high or impulsive)

💡 **Smart Recommendations**
(2–3 concrete, actionable tips tailored to this specific user's data)

Keep it under 250 words. Be direct and specific — reference actual numbers and item names from the data.
Use ₹ for currency. Sound like a smart friend, not a chatbot."""

@app.get("/api/config")
async def get_config():
    """Return Supabase configuration parameters to the frontend."""
    return JSONResponse(content={
        "supabaseUrl": SUPABASE_URL,
        "supabaseKey": SUPABASE_KEY
    })

@app.post("/api/insights")
async def get_insights(expenses: List[Expense]):
    """Call Groq API to generate spending insights and stream response back."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is not set on the backend. Please add it to your .env file."
        )
    
    if not expenses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No expense data provided to analyze."
        )
    
    prompt = build_prompt(expenses)
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.6,
            stream=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to Groq: {str(e)}"
        )

    def stream_generator():
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    return StreamingResponse(stream_generator(), media_type="text/plain")


# Pydantic models for chat request
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    expenses: List[Expense]
    message: str
    history: List[ChatMessage] | None = []

def build_chat_system_prompt(expenses_list: List[Expense]) -> str:
    """Construct a system prompt for the chat assistant based on expense data."""
    if not expenses_list:
        summary_str = "No expenses recorded yet."
    else:
        # Build standard summary statistics
        data = []
        for e in expenses_list:
            data.append({
                "amount": e.amount,
                "category": e.category,
                "date": e.date,
                "item": e.item
            })
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["date"])
        
        total = df["amount"].sum()
        avg_daily = df.groupby(df["date"].dt.date)["amount"].sum().mean()
        
        cat_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
        cat_str = "\n".join(f"  - {cat}: {fmt_inr(val)}" for cat, val in cat_totals.items())
        
        top5 = df.nlargest(5, "amount")[["item", "amount", "category", "date"]]
        top5_str = "\n".join(
            f"  - {row['item']} ({row['category']}) on {row['date'].date()}: {fmt_inr(row['amount'])}"
            for _, row in top5.iterrows()
        )
        
        summary_str = f"""=== EXPENSE SUMMARY ===
Total recorded: {fmt_inr(total)}
Average daily spend: {fmt_inr(avg_daily)}

Category breakdown (all time):
{cat_str}

Top 5 largest expenses:
{top5_str}"""

    return f"""You are a friendly, sharp personal finance assistant for an Indian college student.
The user's expense data is summarized below:

{summary_str}

=== INSTRUCTIONS ===
1. You are having an interactive chat with the student. Keep your responses short, conversational, and direct (1-3 paragraphs, under 150 words).
2. Answer the user's questions specifically using the provided data. Reference actual items, dates, and amounts.
3. Use ₹ for currency.
4. Sound like a smart friend (use some emojis, be encouraging), not a dry chatbot.
5. If the user asks questions unrelated to their finances or budgeting, politely guide them back to their expenses.
6. If the user asks to see a chart, graph, or visual plot of their spending/expenses (e.g. category breakdown, spending trends, or monthly comparisons), you MUST output a single valid JSON block containing Chart.js config parameters inside a ```json-chart code block at the very end of your response.
   Ensure the JSON conforms to standard Chart.js structures (keys: "type", "data", "options").
   Example format:
   ```json-chart
   {{
     "type": "bar",
     "data": {{
       "labels": ["Food", "Travel", "Bills"],
       "datasets": [{{
         "label": "Spending (₹)",
         "data": [1200, 500, 2000]
       }}]
     }},
     "options": {{
       "responsive": true,
       "plugins": {{
         "title": {{ "display": true, "text": "Spending by Category" }}
       }}
     }}
   }}
   ```
   Ensure the JSON block is syntactically valid and completely closed. Do not put comments inside the JSON-chart block. Keep the rest of your response brief and put the chart block at the very bottom."""

@app.post("/api/chat")
async def chat_with_assistant(req: ChatRequest):
    """Interact with Llama 3 via Groq to answer specific questions about expenses."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is not set on the backend. Please add it to your .env file."
        )
    
    system_prompt = build_chat_system_prompt(req.expenses)
    
    # Construct messages array
    messages = [{"role": "system", "content": system_prompt}]
    
    # Append history
    if req.history:
        for msg in req.history:
            messages.append({"role": msg.role, "content": msg.content})
            
    # Append latest message
    messages.append({"role": "user", "content": req.message})
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=500,
            temperature=0.6,
            stream=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to Groq: {str(e)}"
        )

    def stream_generator():
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    return StreamingResponse(stream_generator(), media_type="text/plain")


@app.get("/api/config")
def get_config():
    return {
        "supabaseUrl": SUPABASE_URL,
        "supabaseKey": SUPABASE_KEY
    }

# Mount static files. Must be mounted AFTER other API endpoints so it doesn't intercept them.
os.makedirs("static", exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8502, reload=True)