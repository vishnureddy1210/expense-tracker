# 💰 Expense Tracker

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square)
![Streamlit](https://img.shields.io/badge/Streamlit-1.x-FF4B4B?style=flat-square)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Spaces-FFD21E?style=flat-square)

A simple web app to track your daily expenses with category charts and CSV export. Built with Python and Streamlit.

## Live demo

Try it on Hugging Face Spaces:
https://huggingface.co/spaces/YOUR_USERNAME/expense-tracker

## Features

- Add expenses with item name, amount, category, and date
- View all entries in a sortable table
- Bar chart of spending by category
- Summary metrics: total spent, entry count, top category
- Download all data as a CSV file

## Project structure

```
expense-tracker/
├── app.py            # Main Streamlit app
├── requirements.txt  # Python dependencies
└── README.md         # This file
```

## Run locally

### 1. Clone the repo

```bash
git clone https://github.com/vishnureddy1210/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the app

```bash
streamlit run app.py
```

Opens at http://localhost:8501

## Tech stack

| Library | Purpose |
|---------|---------|
| Streamlit | Web UI framework |
| Pandas | Data handling and grouping |
| Matplotlib | Bar charts |

## Deploy to Hugging Face Spaces

- Go to huggingface.co/spaces → New Space
- Select SDK: Streamlit
- Connect your GitHub repo
- HF installs requirements.txt and runs app.py automatically

---

Made with Python · Streamlit · Hugging Face Spaces