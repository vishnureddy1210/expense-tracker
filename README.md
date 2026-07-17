# 💰 ExpenseTracker🔥💰

A professional, high-fidelity, and interactive personal expense tracker designed for college students. Built with a **FastAPI** backend, a modern **Vanilla HTML/CSS/JS Single Page Application (SPA)** frontend, **Supabase Auth & Database**, and a conversational **Groq AI Assistant (Llama 3.3)**.

🔗 **Live Demo:** https://expense-tracker-et8a.onrender.com  
📦 **GitHub Repository:** [github.com/vishnureddy1210/expense-tracker](https://github.com/vishnureddy1210/expense-tracker)

---

## 🎨 Interactive Visual Interface

### 1. Modern Auth Portal
Features smooth, dynamic HSL floating background orbs and a sleek dark glassmorphism styling.
![Login Page](static/screenshots/login_page_1783751017741.png)

### 2. Main Dashboard Layout
Displays metrics summaries, rotating wisdom advice at the top, real-time transaction tracking, and category budget progress utilization.
![Dashboard Layout](static/screenshots/dashboard_layout_updated_1783751288016.png)

---

## ✨ Features

- 🔐 **Secure Authentication**: Register accounts, sign in, and reset passwords seamlessly using the Supabase Auth SDK.
- 📈 **Interactive Category Budgets**:
  - Configure monthly budget limits (e.g., Food, Travel, Bills, Shopping, Entertainment) under the Settings panel.
  - View dynamic progress bars on the Dashboard showing real-time utilization.
  - Automated color triggers: **Green** for safe spending, **Orange warning** when usage exceeds 85%, and **Flashing Red alert** when limits are exceeded.
  - Persisted in local storage per user session.
- 🔍 **Live Transaction Filters & Search**:
  - Real-time client-side search input instantly filters logged transactions as you type.
  - Category filter pills (All, Food, Travel, Bills, etc.) instantly isolate matches.
- ⚡ **Add Expense presets & Celebrations**:
  - Interactive fast-adding presets (`+₹50`, `+₹100`, `+₹200`, `+₹500`, `+₹1,000`) instantly aggregate input values.
  - **Canvas Confetti** particle bursts celebrate successful logs and auth events.
- 💬 **Conversational AI Chat Assistant**:
  - Replaces traditional static reports with a full-fledged chat interface.
  - Interactive suggested prompts (e.g. *Top Category*, *Find Wasteful Spends*, *Savings Tips*, *Trend Summary*) submit on click.
  - Streams response markdown text block-by-block with typing loaders.
  - Keeps historical messages to provide context-aware feedback.
- 📊 **Visual Analytics**: Interactive breakdowns by category (Donut Chart) and month-over-month trends (Bar Chart) built with Chart.js.
- 🎨 **Appearance Customizations**:
  - Responsive **Dark / Light theme switch** that updates global layouts and typography instantly.
  - Custom color accent picker (Indigo, Terracotta, Emerald, Amber, Violet) that adapts UI accents and chart indicators.
- 📥 **Data Portability**: Export your entire transaction history to a CSV stylesheet in one click.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Vanilla HTML5 / Custom HSL CSS3 | Responsive grid architecture, smooth transitions, custom scrollbars, and scroll actions |
| **Client Libraries** | Supabase JS Client & Chart.js | CDN-integrated database synchronizer and data charts renderer |
| **Backend API** | FastAPI (Python 3.10+) | Fast, asynchronous web backend served via Uvicorn |
| **Database & Auth** | Supabase (PostgreSQL) | Secure row-level security (RLS) tables and auth triggers |
| **AI Stream Engine** | Groq API (Llama 3.3 70B) | Advanced spend patterns analysis and streaming suggestions provider |

---

## 📁 Project Structure

```
expense-tracker/
├── server.py            # FastAPI backend (API endpoints & static file hosting)
├── static/              # SPA Frontend Assets
│   ├── index.html       # Single Page Application layout
│   ├── style.css        # Layouts, typography, theme tokens & card designs
│   ├── app.js           # Client auth, Chart.js integrations & API calls
│   └── callback.html    # Password reset callback page (hash fragments)
├── requirements.txt     # Python backend dependencies
├── package.json         # Node metadata (used for local IDE Intellisense / autocomplete)
├── .env                 # Local environment secrets (do not commit!)
└── README.md            # Project documentation
```

---

## 🚀 Run Locally

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/vishnureddy1210/expense-tracker.git
cd expense-tracker
python -m venv venv
source venv/bin/activate      # macOS/Linux
# venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

### 2. Set Up Supabase Database

Create a project at [supabase.com](https://supabase.com), open the **SQL Editor**, and execute the following schema to initialize tables and row-level security (RLS):

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

### 3. Configure the Environment

Create a `.env` file in the project root folder:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
GROQ_API_KEY=your-groq-api-key
```

> **Get your free Groq API key** at [console.groq.com](https://console.groq.com).

### 4. Launch the Server

Run the FastAPI backend which serves the API and hosts the static files:
```bash
python server.py
```

Open [http://localhost:8502](http://localhost:8502) in your browser.

---

## 🔬 Testing & Verification

1. **Authentication Flows**:
   - Register a new account and verify session tokens.
   - Verify changing passwords inside Settings (uses current session re-authentication).
2. **Dashboard Interactive Checks**:
   - Change color themes under Settings and ensure styling coordinates with charts.
   - Go to Add Expense, select presets, click submit, and confirm confetti trigger.
3. **AI Chat Check**:
   - Enter prompts or click suggests inside AI Insights and verify streaming Markdown chunks.
4. **Data Exports**:
   - Click CSV export to download a sanitised report.

---

## 📄 License

MIT — Free to use, adapt, and build upon.
