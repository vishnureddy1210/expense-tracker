# insights.py — AI-powered spending analysis via Groq (FREE)
# Sign up at https://console.groq.com → API Keys → free tier, no card needed

import pandas as pd
import streamlit as st
from datetime import date
from groq import Groq
from utils import fmt_inr


def _build_prompt(df: pd.DataFrame) -> str:
    """Construct a rich context prompt from the user's expense dataframe."""
    today = date.today()
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])

    # Monthly totals (last 3 months)
    df["month"] = df["date"].dt.to_period("M")
    monthly = df.groupby("month")["amount"].sum().tail(3)
    monthly_str = "\n".join(f"  - {m}: {fmt_inr(v)}" for m, v in monthly.items())

    # Category totals
    cat_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    cat_str = "\n".join(f"  - {cat}: {fmt_inr(val)}" for cat, val in cat_totals.items())

    # Top 5 biggest expenses
    top5 = df.nlargest(5, "amount")[["item", "amount", "category", "date"]]
    top5_str = "\n".join(
        f"  - {row['item']} ({row['category']}) on {row['date'].date()}: {fmt_inr(row['amount'])}"
        for _, row in top5.iterrows()
    )

    # Day-of-week totals
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


def render_insights_tab(df: pd.DataFrame):
    """Render the AI Insights tab content."""
    st.markdown("<div class='section-label'>AI-Powered Analysis</div>", unsafe_allow_html=True)

    if df.empty:
        st.info("Add some expenses first — Llama needs data to analyze!")
        return

    if len(df) < 3:
        st.info("Add at least 3 expenses so the AI can spot meaningful patterns.")
        return

    col_btn, col_note = st.columns([2, 5])
    with col_btn:
        run = st.button("✨ Generate Insights", use_container_width=True, key="run_insights")
    with col_note:
        st.markdown(
            "<p style='color:#a0a4b0;font-size:0.78rem;margin-top:0.6rem;'>"
            "Powered by Llama 3 via Groq — 100% free 🎉</p>",
            unsafe_allow_html=True,
        )

    if not run and "insights_cache" not in st.session_state:
        st.markdown(
            "<div style='text-align:center;padding:3rem 1rem;color:#a0a4b0;'>"
            "<div style='font-size:2.5rem;'>🤖</div>"
            "<div style='font-size:0.95rem;font-weight:600;margin-top:0.5rem;color:#7c7f8e;'>"
            "Click 'Generate Insights' to analyze your spending</div>"
            "<div style='font-size:0.78rem;margin-top:0.3rem;'>Uses Llama 3 — free, no credit card</div>"
            "</div>",
            unsafe_allow_html=True,
        )
        return

    if run:
        st.session_state.pop("insights_cache", None)
        prompt = _build_prompt(df)

        try:
            client = Groq()  # reads GROQ_API_KEY from environment automatically

            placeholder = st.empty()
            streamed    = []

            # Stream the response token by token
            with client.chat.completions.create(
                model       = "llama-3.3-70b-versatile",  # current recommended free model on Groq
                max_tokens  = 600,
                temperature = 0.6,
                stream      = True,
                messages    = [{"role": "user", "content": prompt}],
            ) as stream:
                for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        streamed.append(delta)
                        placeholder.markdown(
                            f"<div class='insight-box'>{''.join(streamed)}</div>",
                            unsafe_allow_html=True,
                        )

            st.session_state.insights_cache = "".join(streamed)

        except Exception as e:
            st.error(
                f"⚠️ Could not connect to Groq: {e}\n\n"
                "Make sure `GROQ_API_KEY` is set in your `.env` file or HF Space secrets."
            )

    elif "insights_cache" in st.session_state:
        st.markdown(
            f"<div class='insight-box'>{st.session_state.insights_cache}</div>",
            unsafe_allow_html=True,
        )