from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import math
    N = 60
    us = [10 + 9 * math.sin(i / 7.0) + (i % 5 - 2) * 0.6 for i in range(N)]
    ex = [6 + 12 * math.sin(i / 8.0 - 0.8) + (i % 3 - 1) * 0.7 for i in range(N)]
    tb = [2.5 + i * 0.03 for i in range(N)]
    X, Y = M.scale(us + ex, 16, 352, 44, 296, -16, 26)
    Xs = lambda i: 16 + i * (336 / (N - 1))
    for i in range(N):
        pick = "#2997ff" if us[i] > tb[i] and us[i] >= ex[i] else "#30d158" if us[i] > tb[i] else "#f4b942"
        p.append(M.r(Xs(i) - 2.9, 44, 5.8, 252, pick, 0.12))
    p.append(M.ln(16, Y(0), 352, Y(0), "#48484a", 1, "2 3"))
    p.append(M.pl([(Xs(i), Y(tb[i])) for i in range(N)], "#86868b", 1.4))
    p.append(M.pl([(Xs(i), Y(us[i])) for i in range(N)], "#2997ff", 2))
    p.append(M.pl([(Xs(i), Y(ex[i])) for i in range(N)], "#30d158", 2))
    p.append(M.r(Xs(31) - 30, Y(max(us[31], ex[31])) - 30, 60, 18, "#f4b942", 0.95, 4))
    p.append(M.t(Xs(31), Y(max(us[31], ex[31])) - 17, "&#8594; Bonds", "#000", 10, "middle", 700))
    p.append(M.t(16, 24, "GEM &#183; 12-month total returns", "#86868b", 12))
    rows = [
        ([("12-month return", "#86868b"), ("completed months", "#86868b")], "#141416"),
        ([("US stocks", "#2997ff"), ("+12.0%", "#f5f5f7")], "#1d1d1f"),
        ([("Non-US stocks", "#30d158"), ("+13.8%", "#f5f5f7")], "#1d1d1f"),
        ([("T-bills", "#86868b"), ("+3.7%", "#f5f5f7")], "#1d1d1f"),
        ([("Bonds", "#f4b942"), ("+4.1%", "#f5f5f7")], "#1d1d1f"),
        ([("Hold", "#86868b"), ("Non-US stocks", "#30d158")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(96, 96)))
    return M.svg("An illustrative mock of the indicator: 12-month returns for US stocks, non-US stocks and T-bills as lines in a lower pane, background shaded by what the strategy holds, a label marking a switch to bonds, and a table with each 12-month return and the current holding, non-US stocks.", p)


SPEC = {
    "slug": "dual-momentum",
    "name": "Dual Momentum",
    "seo_title": "Dual Momentum (Gary Antonacci, GEM), Explained",
    "desc": "Gary Antonacci's Dual Momentum: hold the stronger of US and world stocks over 12 months, but only if they beat T-bills, else bonds. Free indicator.",
    "kicker": "Famous strategies &middot; ETFs &middot; Gary Antonacci, <i>Dual Momentum Investing</i>, 2014",
    "h1": "Dual <span>Momentum</span>",
    "thesis": "Two kinds of momentum, used together. Relative momentum picks the stronger of two stock markets. Absolute momentum asks whether stocks are beating T-bills at all, and if they aren't, it holds bonds instead. One decision a month.",
    "thesis_em": "The stronger market, or bonds.",
    "counts": [("12", "months of returns, checked monthly"), ("3", "places the money can be: US, non-US, bonds"), ("22.7%", "worst drawdown, 1974&ndash;2013, vs 60.2%")],
    "ribbon": ["Month-end", "US vs non-US stocks", "The winner vs T-bills", "Stocks or bonds", "Repeat monthly"],
    "facts": [
        ("book", "<i>Dual Momentum Investing</i> (McGraw-Hill, 2014)"),
        ("author", "Gary Antonacci"),
        ("model", "Global Equities Momentum (GEM)"),
        ("relative", "S&amp;P 500 vs MSCI ACWI ex-US, 12-month total return"),
        ("absolute", "S&amp;P 500 vs T-bills; if it trails, US aggregate bonds"),
        ("backtest", "1974&ndash;2013, before costs and taxes"),
        ("GEM", "17.43% a year, volatility 12.64%, Sharpe 0.87, worst drawdown 22.72%"),
        ("world stocks", "8.85% a year, 15.56%, Sharpe 0.22, worst drawdown 60.21%"),
    ],
    "blocks": [
        {"type": "head", "id": "relative", "h2": "Relative momentum", "p": "The first test is the one behind most momentum research: among a few choices, hold whatever has done best lately. Antonacci uses just two, the US stock market and the rest of the world's."},
        {"type": "anim", "key": "relative", "title": "The stronger market", "aria": "Two made-up stock markets rebased to 100 a year ago: non-US stocks end up 17% and US stocks up 9%, so the next month is held entirely in non-US stocks."},
        {"type": "head", "id": "absolute", "h2": "Absolute momentum", "p": "Relative momentum always picks something, even when both markets are falling. The second test fixes that: the pick has to be beating cash, or the money goes to bonds."},
        {"type": "anim", "key": "absolute", "title": "Beating T-bills", "aria": "A made-up bad year: US stocks down 6% and non-US stocks down 11%; US stocks win on relative momentum but trail T-bills at plus 3%, so the strategy holds US bonds."},
        {"type": "main", "stage": {"h3": "The rule (GEM)", "li": [
            "At each month-end, take the 12-month total returns of US stocks (the S&amp;P 500), non-US stocks (MSCI ACWI ex-US) and T-bills.",
            "If US stocks beat T-bills, hold whichever stock market did better over the 12 months.",
            "If US stocks trailed T-bills, hold US aggregate bonds. Check again next month-end.",
        ], "why": "Relative momentum adds return by riding the stronger market. Absolute momentum cuts risk by stepping out of stocks when their trend has turned down."},
            "right": [
                panel("Two tests, two jobs", "Why it uses both.", pair(
                    ("yes", "relative", "Which market?", "Picks the stronger of US and non-US stocks. On its own, it stays fully in stocks through bear markets."),
                    ("care", "absolute", "Stocks at all?", "Compares US stocks with T-bills. When they trail, the whole account goes to bonds."))),
                calc("The made-up examples", "From the two walkthroughs above.", [("Good year: non-US vs US", "+17% vs +9%"), ("Hold", "Non-US stocks"), ("Bad year: US vs T-bills", "&minus;6% vs +3%"), ("Hold", "US bonds", "tot")]),
            ]},
        {"type": "head", "id": "switch", "h2": "Over a cycle", "p": "Put month after month together and the strategy spends most of its time in one stock market or the other, and moves to bonds for the long declines."},
        {"type": "anim", "key": "switch", "title": "What it held", "aria": "A made-up eight years of monthly returns: dual momentum switches between US and non-US stocks as the lead changes, moves to bonds during a bear market and returns afterward, ending ahead of a portfolio held half in each stock market."},
        {"type": "main", "stage": {"h3": "What it's like to follow", "li": [
            "Few trades: most months nothing changes, and there are only three places the money can be.",
            "Always late: a 12-month lookback reacts after a decline has started and after a recovery is under way.",
            "Fast reversals hurt most: a sharp drop and a quick rebound can switch it out near the low and back in higher.",
        ], "why": "The rule pays off over long bear markets, like 2000&ndash;02 and 2008, and pays for it in quick V-shaped selloffs."},
            "right": [
                qb("<b>Momentum, twice.</b> Antonacci's point was that relative momentum (Jegadeesh and Titman's winners keep winning) and absolute momentum (an asset's own trend) do different jobs, and work better together than either does alone."),
            ]},
        {"type": "head", "id": "results", "h2": "The book's backtest", "p": "Every number below is from <i>Dual Momentum Investing</i>, 1974&ndash;2013, before trading costs and taxes."},
        {"type": "anim", "key": "results", "title": "GEM vs world stocks", "aria": "Antonacci's 1974 to 2013 backtest: Global Equities Momentum returned 17.43% a year against 8.85% for the MSCI All Country World Index, with volatility of 12.64% against 15.56%, a worst drawdown of 22.72% against 60.21%, and a Sharpe ratio of 0.87 against 0.22."},
        {"type": "four", "cards": [
            ("#f4b942", "return", "17.43% a year", "Against 8.85% for world stocks (MSCI ACWI), 1974&ndash;2013."),
            ("#2997ff", "volatility", "12.64%", "Against 15.56%, while holding a single stock market most of the time."),
            ("#30d158", "worst drawdown", "22.72%", "Against 60.21%. Bonds during the long bear markets did most of the work."),
            ("#ff453a", "the catch", "One 40-year test", "Before costs and taxes, on indexes. Results since the book have been more uneven."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "1993", "Relative momentum", "Jegadeesh and Titman show that recent winners keep beating recent losers for months."),
            ("#2997ff", "2012", "Time-series momentum", "Moskowitz, Ooi and Pedersen document absolute momentum: an asset's own past year predicts its next month, across markets."),
            ("#30d158", "2012", "Antonacci's paper", "<i>Risk Premia Harvesting Through Dual Momentum</i> wins the NAAIM Wagner Award."),
            ("#f4b942", "2014", "<i>Dual Momentum Investing</i>", "The book and the GEM model: US vs non-US stocks, with bonds when stocks trail T-bills."),
        ]},
    ],
    "steps": [
        {"h3": "Month-end", "li": ["On the last trading day, look up 12-month total returns.", "US stocks, non-US stocks and T-bills."], "why": "One check a month."},
        {"h3": "Relative", "li": ["Compare US with non-US stocks.", "The higher 12-month return is the pick."], "why": "Ride the stronger market."},
        {"h3": "Absolute", "li": ["Compare US stocks with T-bills.", "Trailing T-bills means the trend is down."], "why": "Decide whether to own stocks at all."},
        {"h3": "Hold", "li": ["US stocks beat T-bills: hold the pick.", "They didn't: hold US aggregate bonds."], "why": "All of the money in one place."},
        {"h3": "Repeat", "li": ["Switch only when one of the tests flips.", "Most months, nothing changes."], "why": "Few trades, low costs."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It works out the GEM signal from four ETFs, shows the 12-month returns, shades what the model holds, and alerts when it switches. It marks and alerts. It doesn't place trades.",
        "name": "Dual Momentum (GEM)",
        "blurbs": [
            "In a pane under the chart: the 12-month total returns of US stocks (SPY), non-US stocks (VEU) and T-bills (BIL), with the background shaded blue, green or gold for what dual momentum holds, and a label at every switch.",
            "A table with each 12-month return, including bonds (AGG), and the holding for the next month. It uses only completed months, so the signal never changes mid-month, and adds dividends back, as the book's total returns do.",
            "<span style=\"color:var(--ash)\">Antonacci tested the indexes back to 1974. The ETFs are the usual stand-ins for following it today. Every symbol and the lookback are settings.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Any chart and timeframe works; a weekly SPY chart shows a long history.",
            "To get alerted, create an alert on the chart and pick <b>GEM: switch</b> or <b>GEM: to bonds</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/cross-sectional-momentum.html", "#30d158", "famous strategy", "Cross-Sectional Momentum", "Relative momentum across thousands of stocks."),
        ("/famous-strategies/ten-month-sma.html", "#2997ff", "famous strategy", "10-Month Moving Average", "Another trend filter for stepping out of stocks."),
        ("/famous-strategies/low-volatility.html", "#f4b942", "famous strategy", "Low-Volatility Anomaly", "A different route to smaller drawdowns."),
        ("/famous-strategies/can-slim.html", "#ff9f0a", "famous strategy", "CAN SLIM", "Market direction first, the same idea for single stocks."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "On the last trading day of each month, write down the 12-month total returns of SPY, VEU and BIL, and what GEM says to hold. Do it for a year and count the switches, including any that reversed the month after.",
        "li": ["Check only at month-end.", "Use total returns, with dividends.", "Write the holding down before the next month starts."],
    },
    "sources": [
        "Antonacci, G. (2014). <i>Dual Momentum Investing: An Innovative Strategy for Higher Returns with Lower Risk</i>. McGraw-Hill. <a class=\"cite-link\" href=\"https://www.mheducation.com/highered/mhp/product/dual-momentum-investing-innovative-strategy-higher-returns-lower-risk.html\" target=\"_blank\" rel=\"noopener\">Source &rsaquo;</a><small>The Global Equities Momentum model: S&amp;P 500 vs MSCI ACWI ex-US on 12-month returns, the S&amp;P 500 vs T-bills, Barclays US Aggregate bonds as the alternative. 1974&ndash;2013: 17.43% a year, standard deviation 12.64%, Sharpe 0.87, worst drawdown 22.72%; MSCI ACWI 8.85%, 15.56%, 0.22, 60.21%. Figures before costs and taxes, as reported in reviews of the book.</small>",
        "Jegadeesh, N. &amp; Titman, S. (1993). Returns to Buying Winners and Selling Losers. <i>Journal of Finance</i>, 48(1), 65&ndash;91.",
        "Moskowitz, T. J., Ooi, Y. H. &amp; Pedersen, L. H. (2012). Time Series Momentum. <i>Journal of Financial Economics</i>, 104(2), 228&ndash;250.",
    ],
    "src": "Built from the book and the sources listed above. Every price and return in the first three walkthroughs is made up for illustration. The results chart and cards use the book's published numbers, which are a backtest on indexes, before trading costs and taxes. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Gary Antonacci",
    "card": "Hold the stronger of US and non-US stocks, but only while US stocks beat T-bills. Otherwise, bonds.",
}
