# 💰 Expense Tracker

A personal expense tracking web app built with **Streamlit** and **Supabase**.

🔗 **Live Demo:** [Add your Hugging Face link here]  
📦 **Repo:** [github.com/vishnureddy1210/expense-tracker](https://github.com/vishnureddy1210/expense-tracker)

---

## ✨ Features

- 🔐 Secure sign up & login via Supabase Auth
- ➕ Add expenses with item, amount, category & date
- 📊 Dashboard metrics — total spent, entries, top category
- 🗑️ Delete individual expenses
- 📈 Spending breakdown bar chart by category
- 📥 Export all expenses as CSV

---

## 🛠️ Tech Stack

| | Tool |
|---|---|
| Frontend | Streamlit |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Language | Python 3 |
| Charts | Matplotlib |

---

## 📁 Project Structure

```
expense-tracker/
├── app.py            # Main Streamlit UI
├── auth.py           # Login / signup / logout
├── database.py       # DB helpers (add, load, delete)
├── requirements.txt  # Python dependencies
├── .env              # Local secrets (never commit)
└── README.md
```

---

## 🚀 Run Locally

### 1. Clone the repo
```bash
git clone https://github.com/vishnureddy1210/expense-tracker.git
cd expense-tracker
```

### 2. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run this in the **SQL Editor**:

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
ON expenses FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 5. Add environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-publishable-key
```

### 6. Run the app
```bash
streamlit run app.py
```

---

## ☁️ Deploy to Hugging Face Spaces

1. Create a new Space at [huggingface.co/spaces](https://huggingface.co/spaces) with **Streamlit** SDK
2. Push this repo to the Space
3. Go to **Settings → Variables and Secrets** and add:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase publishable key |

---

## 📦 Requirements

```
streamlit
supabase
pandas
matplotlib
python-dotenv
```

---

## 📄 License

MIT — free to use and modify.
