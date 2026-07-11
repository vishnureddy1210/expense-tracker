# 💰Expense tracker

A personal expense tracker for Indian college students — built with **Streamlit**, **Supabase**, and **Claude AI**.

🔗 **Live Demo:** [Add your Hugging Face link here]
📦 **Repo:** [github.com/vishnureddy1210/expense-tracker](https://github.com/vishnureddy1210/expense-tracker)

---

## ✨ What's New in v2

| Feature | v1 | v2 |
|---|---|---|
| Layout | Single page scroll | **Tabbed** (Dashboard / Add / Analytics / AI) |
| Charts | Bar chart only | **Donut chart** + Month-over-Month bar |
| AI | ❌ | **Claude AI insights** — patterns, alerts, tips |
| Metrics | Static totals | **MoM delta %** on total spend card |
| Performance | Fetches on every rerender | **`@st.cache_data`** with 30s TTL |
| Code | All in `app.py` | **Modular** — `utils`, `analytics`, `insights` |
| Expense list | Shows all | Shows **latest 20** with count note |

---

## ✨ Features

- 🔐 Secure sign up, login & password reset via Supabase Auth
- ➕ Add expenses with item, amount, category & date
- 📊 Dashboard — total spent, this-month total, MoM delta, top category
- 🍩 Donut chart with % breakdown by category
- 📅 Month-over-month bar chart (last 6 months)
- 🏆 Top 5 biggest expenses table
- 🤖 AI Insights — Claude analyzes spending patterns, spots waste, gives tips
- 🗑️ Delete individual expenses
- 📥 Export all expenses as CSV

---

## 🛠️ Tech Stack

| | Tool |
|---|---|
| Frontend | Streamlit |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Llama 3 70B via Groq (free tier) |
| Language | Python 3.10+ |
| Charts | Matplotlib |

---

## 📁 Project Structure

```
expense-tracker/
├── app.py            # Main Streamlit app (tabbed layout)
├── auth.py           # Login / signup / logout / password reset
├── database.py       # DB helpers with @st.cache_data
├── utils.py          # Shared constants, styles, helpers
├── analytics.py      # Charts: donut, MoM bar, top-5 table
├── insights.py       # Claude AI spending analysis
├── requirements.txt  # Python dependencies
├── .env              # Local secrets (never commit!)
└── README.md
```

---

## 🚀 Run Locally

### 1. Clone & install

```bash
git clone https://github.com/vishnureddy1210/expense-tracker.git
cd expense-tracker
python -m venv venv
source venv/bin/activate      # macOS/Linux
# venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), run in **SQL Editor**:

```sql
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  item TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  date DATE,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own expenses"
ON expenses FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 3. Configure environment

Create `.env` in the project root:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
GROQ_API_KEY=your-groq-api-key
SITE_URL=http://localhost:8502/callback.html
```

> **Get your free Groq API key** at [console.groq.com](https://console.groq.com) → sign up → API Keys. No credit card, no cost.

### 4. Run

To run the new modern web UI (served by a FastAPI backend on port 8502):
```bash
python server.py
```
Open [http://localhost:8502](http://localhost:8502) in your browser.

*(Optional)* To run the legacy Streamlit UI on port 8501:
```bash
streamlit run app.py
```

---

## ☁️ Deploy to Hugging Face Spaces

1. Create a Space at [huggingface.co/spaces](https://huggingface.co/spaces) — SDK: **Streamlit**
2. Push your repo
3. Add secrets under **Settings → Variables and Secrets**:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anon key |
| `GROQ_API_KEY` | Your Groq API key (free at console.groq.com) |
| `SITE_URL` | Your HF Space URL (for password reset redirect) |

---

## 📄 License

MIT — free to use and modify.
