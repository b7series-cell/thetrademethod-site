from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import random
    random.seed(12)
    vals = []
    v = 100.0
    tom_idx = []
    for m in range(3):
        for i in range(21):
            tom = i == 20 or i < 3
            v *= 1 + (0.003 if tom else 0.0) + random.uniform(-0.008, 0.008)
            vals.append(v)
            if tom:
                tom_idx.append(len(vals) - 1)
    X, Y = M.scale(vals, 16, 352, 44, 296, min(vals) - 1, max(vals) + 2)
    for i in tom_idx:
        p.append(M.r(X(i) - 2.8, 44, 5.6, 252, "#30d158", 0.16))
    p.append(M.candles(vals, X, Y, seed=5, w=3.2))
    for i in (19, 40):
        p.append(M.r(X(i) - 22, Y(vals[i]) + 14, 44, 16, "#2997ff", 0.95, 4))
        p.append(M.t(X(i), Y(vals[i]) + 25, "buy at close", "#fff", 8, "middle", 700))
    for i in (23, 44):
        p.append(M.r(X(i) - 22, Y(vals[i]) - 30, 44, 16, "#f4b942", 0.95, 4))
        p.append(M.t(X(i), Y(vals[i]) - 19, "sell at close", "#000", 8, "middle", 700))
    p.append(M.t(16, 24, "TOM &#183; daily", "#86868b", 12))
    rows = [
        ([("Today", "#86868b"), ("outside the window", "#f5f5f7")], "#1d1d1f"),
        ([("Avg day, turn of month", "#86868b"), ("+0.080%", "#30d158")], "#1d1d1f"),
        ([("Avg day, rest of month", "#86868b"), ("+0.031%", "#f5f5f7")], "#1d1d1f"),
        ([("Days counted", "#86868b"), ("1614 in / 6894 out", "#f5f5f7")], "#1d1d1f"),
        ([("Holidays", "#86868b"), ("not known: check by hand", "#f4b942")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(120, 126)))
    return M.svg("An illustrative mock of the indicator: made-up daily candles with the four turn-of-the-month days in each month shaded green, buy-at-close labels the day before each month's last trading day and sell-at-close labels on the third trading day, and a table comparing the average turn-of-the-month day with the rest of the month.", p)


SPEC = {
    "slug": "turn-of-the-month",
    "name": "Turn of the Month",
    "seo_title": "The Turn-of-the-Month Effect in Stocks, Explained",
    "desc": "US stock returns cluster on four days: the last of each month and the first three of the next. The 1926-2005 study, how to trade it, an indicator.",
    "kicker": "Famous strategies &middot; ETFs &middot; Lakonishok &amp; Smidt 1988 &middot; McConnell &amp; Xu 2008",
    "h1": "Turn of the <span>Month</span>",
    "thesis": "For most of the last century, US stocks earned their return in a few days each month. The last trading day of the month and the first three of the next did the work; the days in between, on average, did nothing.",
    "thesis_em": "Four days a month.",
    "counts": [("4", "trading days around each month-end"), ("0.15%", "a day on those days, 1926&ndash;2005"), ("31 of 35", "countries with the same pattern")],
    "ribbon": ["Find the last trading day", "Buy the close before it", "Hold four days", "Sell after day three", "Cash the rest of the month"],
    "facts": [
        ("first studied", "Ariel (1987); Lakonishok &amp; Smidt, <i>Review of Financial Studies</i>, 1988"),
        ("90 years", "Lakonishok &amp; Smidt's Dow Jones data"),
        ("biggest test", "McConnell &amp; Xu, <i>Financial Analysts Journal</i>, 2008"),
        ("window", "The last trading day and the first three of the next month"),
        ("value-weighted", "0.15% a day in the window, &minus;0.001% on other days"),
        ("equal-weighted", "0.22% a day in the window, 0.04% on other days"),
        ("worldwide", "31 of 35 countries"),
        ("explained by flows?", "No: no extra volume or fund inflows found"),
    ],
    "blocks": [
        {"type": "head", "id": "calendar", "h2": "Which four days", "p": "The window is defined by trading days, not calendar dates, so it moves around weekends and holidays."},
        {"type": "anim", "key": "calendar", "title": "The window", "aria": "Two made-up months of trading days: the last trading day of the first month and the first three of the second are highlighted, with a buy at the close the day before the last day and a sell at the close of the third day."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Find the month's last trading day. Buy a broad index fund such as SPY at the close of the trading day before it.",
            "Hold through the last trading day and the first three trading days of the new month.",
            "Sell at the close of the third trading day, and hold cash or T-bills until the next month's turn.",
        ], "why": "If the market's return really is concentrated in these days, owning only them keeps most of the return with a fraction of the time in the market."},
            "right": [
                panel("How to use it", "Two ways traders apply it.", pair(
                    ("yes", "on its own", "In four days, out the rest", "Hold the index only in the window. About a fifth of the time in the market."),
                    ("care", "as a tilt", "Timing other trades", "Keep a long-term portfolio, and time new money or rebalancing around the window."))),
                calc("McConnell &amp; Xu, 1926&ndash;2005", "Average return per trading day, value-weighted US stocks.", [("Turn-of-the-month days", "0.15%"), ("All other days", "&minus;0.001%"), ("Equal-weighted, turn days", "0.22%"), ("Equal-weighted, other days", "0.04%", "tot")]),
            ]},
        {"type": "head", "id": "split", "h2": "Where the return was", "p": "The surprising part isn't that the turn of the month was good. It's that the rest of the month, on average, earned nothing."},
        {"type": "anim", "key": "split", "title": "In the window and out of it", "aria": "McConnell and Xu's average daily returns, 1926 to 2005: value-weighted US stocks 0.15% a day on the four turn-of-the-month days against minus 0.001% on other days; equal-weighted 0.22% against 0.04%."},
        {"type": "head", "id": "trade", "h2": "Trading it", "p": "A year of the strategy looks like a series of short visits to the market, four days at a time."},
        {"type": "anim", "key": "trade", "title": "Four days a month", "aria": "A made-up year of daily index returns with the turn-of-the-month days shaded green; one line holds the fund only on those days and another holds it every day."},
        {"type": "head", "id": "global", "h2": "Everywhere, and unexplained", "p": "The effect has shown up across countries and across decades, and the obvious explanations haven't held up."},
        {"type": "anim", "key": "global", "title": "31 of 35 countries", "aria": "A grid of 35 squares standing for 35 countries' stock markets, 31 lit green for the turn-of-the-month pattern; below, higher volume, fund inflows and small stocks are each ruled out as the explanation."},
        {"type": "four", "cards": [
            ("#30d158", "where the return was", "0.15% vs &minus;0.001%", "A day, value-weighted US stocks, turn of the month vs the rest, 1926&ndash;2005."),
            ("#2997ff", "worldwide", "31 of 35", "Countries where McConnell and Xu found the same pattern."),
            ("#f4b942", "our SPY run", "+0.080% vs +0.031%", "Average day in vs out of the window, SPY since 1993, price only, our run of the indicator."),
            ("#ff453a", "the catch", "Out 80% of the time", "Big rallies in the middle of a month are missed. Costs and taxes add up at 12 round trips a year."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "1987", "Ariel", "A monthly pattern: stock returns concentrated around the start of the month."),
            ("#2997ff", "1988", "Lakonishok &amp; Smidt", "Ninety years of the Dow: persistent turn-of-the-month, week, year and holiday effects."),
            ("#30d158", "2008", "McConnell &amp; Xu", "1926&ndash;2005 and 35 countries: the market's reward concentrated in four days; flows don't explain it."),
            ("#f4b942", "Since", "Still watched", "One of the most cited calendar effects, and one of the easiest to test yourself."),
        ]},
    ],
    "steps": [
        {"h3": "Count", "li": ["Find the month's last trading day.", "Skip weekends and market holidays."], "why": "Trading days, not dates."},
        {"h3": "Buy", "li": ["Buy a broad index fund at the close of the day before the last trading day.", "That way you own the last day's return."], "why": "The window starts on the last day."},
        {"h3": "Hold", "li": ["Hold through the last trading day.", "And the first three trading days of the new month."], "why": "Four days in the market."},
        {"h3": "Sell", "li": ["Sell at the close of the third trading day.", "Move to cash or T-bills."], "why": "The window ends there."},
        {"h3": "Wait", "li": ["No position for the rest of the month.", "Repeat at the next turn."], "why": "On average, those days earned nothing."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It shades the turn-of-the-month days, marks when to buy and sell, alerts on both, and compares the average day in and out of the window on your chart's history. It marks and alerts. It doesn't place trades.",
        "name": "Turn of the Month",
        "blurbs": [
            "On the chart: the four turn-of-the-month days shaded green each month, a buy-at-close label the day before the last trading day and a sell-at-close label on the third trading day.",
            "A table with where today falls in the cycle and the average daily return in the window against the rest of the month, over the whole chart. On SPY's daily history since 1993, our run showed +0.080% a day in the window and +0.031% outside it, price only.",
            "<span style=\"color:var(--ash)\">The script works out the last trading day from the calendar and skips weekends, but it can't know market holidays, so check the last week of each month by hand. The number of days held into the new month is a setting.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a daily chart of SPY or another broad index fund.",
            "To get alerted, create an alert on the chart and pick <b>TOM: buy at the close</b> or <b>TOM: sell at the close</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/overnight-effect.html", "#30d158", "famous strategy", "Overnight Effect", "Another calendar pattern: when in the day the market's return arrives."),
        ("/famous-strategies/ten-month-sma.html", "#2997ff", "famous strategy", "10-Month Moving Average", "A monthly rule built on trend instead of the calendar."),
        ("/famous-strategies/rsi-2.html", "#f4b942", "famous strategy", "RSI(2)", "Another short-hold index fund strategy."),
        ("/famous-strategies/dual-momentum.html", "#ff9f0a", "famous strategy", "Dual Momentum", "A once-a-month decision of a different kind."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Put the indicator on a daily SPY chart. For the next six months, write down the buy price at the close before each month's last trading day and the sell price at the close of day three, and compare the total with simply holding SPY.",
        "li": ["Check the holiday calendar each month.", "Record actual closing prices.", "Count costs for 12 round trips a year."],
    },
    "sources": [
        "McConnell, J. J. &amp; Xu, W. (2008). Equity Returns at the Turn of the Month. <i>Financial Analysts Journal</i>, 64(2), 49&ndash;64.<small>CRSP daily data, 1926&ndash;2005: average daily returns of 0.15% (value-weighted) and 0.22% (equal-weighted) on the four turn-of-the-month days, against &minus;0.001% and 0.04% on other days; no average reward for market risk except around the turn of the month; not confined to small or low-priced stocks or to quarter- and year-ends, not explained by volatility; present in 31 of 35 countries; no higher volume or net fund inflows; &ldquo;a puzzle in search of an answer.&rdquo;</small>",
        "Lakonishok, J. &amp; Smidt, S. (1988). Are Seasonal Anomalies Real? A Ninety-Year Perspective. <i>Review of Financial Studies</i>, 1(4), 403&ndash;425.<small>Ninety years of daily Dow Jones data: persistently anomalous returns around the turn of the week, month and year, and holidays.</small>",
        "Ariel, R. A. (1987). A Monthly Effect in Stock Returns. <i>Journal of Financial Economics</i>, 18(1), 161&ndash;174.",
    ],
    "src": "Built from the papers listed above. The calendar and the year of returns in the walkthroughs are made up for illustration. The return bars and the country count use the published numbers. The SPY figures are from our own TradingView run of the indicator on this page, price only, not from a published study. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Lakonishok, Smidt; McConnell, Xu",
    "card": "Own the index only from the close before the month's last trading day to the close of the third day of the next.",
}
