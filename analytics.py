# analytics.py — Charts and analytics for SpendSense

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import streamlit as st
from utils import CATEGORY_STYLE, CHART_COLORS, fmt_inr


def _donut_chart(df: pd.DataFrame):
    """Render a clean donut chart of spending by category."""
    cat_data = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    if cat_data.empty:
        return

    colors = [CHART_COLORS.get(c, "#e8eaf0") for c in cat_data.index]
    total  = cat_data.sum()

    fig, ax = plt.subplots(figsize=(6, 4.5), facecolor="#ffffff")
    ax.set_facecolor("#ffffff")

    wedges, _ = ax.pie(
        cat_data.values,
        colors     = colors,
        startangle = 90,
        wedgeprops = dict(width=0.52, edgecolor="#ffffff", linewidth=2.5),
    )

    # Centre label
    ax.text(0, 0.06, "Total", ha="center", va="center",
            fontsize=9, color="#a0a4b0", fontweight="600")
    ax.text(0, -0.18, fmt_inr(total), ha="center", va="center",
            fontsize=14, color="#1a1a2e", fontweight="700")

    # Custom legend with amounts
    legend_labels = [
        f"{CATEGORY_STYLE.get(c, ('📌',))[0]}  {c}  —  {fmt_inr(v)}  ({v/total*100:.0f}%)"
        for c, v in zip(cat_data.index, cat_data.values)
    ]
    patches = [
        mpatches.Patch(facecolor=CHART_COLORS.get(c, "#e8eaf0"), edgecolor="none")
        for c in cat_data.index
    ]
    ax.legend(
        patches, legend_labels,
        loc            = "lower center",
        bbox_to_anchor = (0.5, -0.28),
        ncol           = 2,
        fontsize       = 8,
        frameon        = False,
        labelcolor     = "#4a4e6a",
    )

    plt.tight_layout(pad=1.0)
    st.pyplot(fig, use_container_width=True)
    plt.close()


def _mom_bar(df: pd.DataFrame):
    """Month-over-month bar chart for the last 6 months."""
    df = df.copy()
    df["date"]  = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    monthly = (
        df.groupby("month")["amount"]
        .sum()
        .tail(6)
        .reset_index()
    )
    if len(monthly) < 2:
        st.caption("Not enough months to compare yet — keep adding expenses!")
        return

    labels  = [str(m) for m in monthly["month"]]
    values  = monthly["amount"].values
    n       = len(values)

    # Colour last bar differently
    bar_colors = ["#c7caf8"] * (n - 1) + ["#5b6af0"]

    fig, ax = plt.subplots(figsize=(6.5, 2.8), facecolor="#ffffff")
    ax.set_facecolor("#ffffff")
    bars = ax.bar(labels, values, color=bar_colors,
                  edgecolor="#ffffff", linewidth=1.5, width=0.55, zorder=3)

    for bar, val in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(values) * 0.025,
            fmt_inr(val),
            ha="center", va="bottom",
            color="#4a4e6a", fontsize=8, fontweight="bold",
        )

    # MoM delta annotation
    if n >= 2:
        delta     = values[-1] - values[-2]
        delta_pct = (delta / values[-2] * 100) if values[-2] else 0
        sign      = "▲" if delta > 0 else "▼"
        clr       = "#b91c1c" if delta > 0 else "#15803d"
        ax.set_title(
            f"vs last month: {sign} {abs(delta_pct):.0f}%  ({fmt_inr(abs(delta))})",
            fontsize=8.5, color=clr, fontweight="600", pad=6,
        )

    ax.set_ylabel("Amount (₹)", color="#a0a4b0", fontsize=8.5)
    ax.tick_params(colors="#a0a4b0", labelsize=8.5)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.yaxis.grid(True, color="#f0f1f5", zorder=0)
    ax.set_axisbelow(True)
    plt.xticks(rotation=20, ha="right", color="#4a4e6a", fontsize=8.5)
    plt.tight_layout(pad=0.8)
    st.pyplot(fig, use_container_width=True)
    plt.close()


def _top5_table(df: pd.DataFrame):
    """Display top 5 biggest individual expenses."""
    top5 = df.nlargest(5, "amount")[["item", "category", "amount", "date"]].copy()
    top5["amount"] = top5["amount"].apply(fmt_inr)
    top5.columns   = ["Item", "Category", "Amount", "Date"]
    top5.index     = range(1, len(top5) + 1)
    st.dataframe(top5, use_container_width=True)


def render_analytics_tab(df: pd.DataFrame):
    """Render the Analytics tab content."""
    if df.empty:
        st.info("Add some expenses to see your analytics.")
        return

    st.markdown("<div class='section-label'>Spending by Category</div>", unsafe_allow_html=True)
    _donut_chart(df)

    st.markdown("<div class='section-label'>Month-over-Month</div>", unsafe_allow_html=True)
    _mom_bar(df)

    st.markdown("<div class='section-label'>Top 5 Biggest Expenses</div>", unsafe_allow_html=True)
    _top5_table(df)

    # Export
    st.markdown("<div style='height:0.5rem'></div>", unsafe_allow_html=True)
    st.download_button(
        "📥 Download all expenses as CSV",
        df.to_csv(index=False),
        "spendsense_expenses.csv",
        "text/csv",
        use_container_width=True,
    )