from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    p = []
    import math
    N = 60
    lines = [
        ("#2997ff", [14 + 10 * math.sin(i / 9.0) for i in range(N)]),
        ("#ff9f0a", [4 + 16 * math.sin(i / 7.0 - 1.4) for i in range(N)]),
        ("#30d158", [8 + 6 * math.sin(i / 11.0 + 0.7) for i in range(N)]),
        ("#bf5af2", [6 + 11 * math.sin(i / 8.0 + 2.2) for i in range(N)]),
    ]
    Xs = lambda i: 16 + i * (336 / (N - 1))
    lo, hi = -16, 28
    Y = lambda v: 296 - (v - lo) / (hi - lo) * 252
    p.append(M.r(Xs(40), 44, Xs(48) - Xs(40), 252, "#ff453a", 0.10))
    p.append(M.ln(16, Y(0), 352, Y(0), "#48484a", 1, "2 3"))
    for col, v in lines:
        p.append(M.pl([(Xs(i), Y(v[i])) for i in range(N)], col, 1.8))
    p.append(M.t(Xs(44), 60, "T-bills", "#ff453a", 10, "middle", 700))
    p.append(M.t(16, 24, "Sectors &#183; momentum, completed months", "#86868b", 12))
    rows = [
        ([("#", "#86868b"), ("Sector", "#86868b"), ("Momentum", "#86868b")], "#141416"),
        ([("1", "#30d158"), ("Technology &#9679;", "#30d158"), ("+10.4%", "#f5f5f7")], "#1d1d1f"),
        ([("2", "#30d158"), ("Communication &#9679;", "#30d158"), ("+8.9%", "#f5f5f7")], "#1d1d1f"),
        ([("3", "#30d158"), ("Industrials &#9679;", "#30d158"), ("+7.2%", "#f5f5f7")], "#1d1d1f"),
        ([("4", "#86868b"), ("Financials", "#f5f5f7"), ("+6.2%", "#f5f5f7")], "#1d1d1f"),
        ([("5", "#86868b"), ("Utilities", "#f5f5f7"), ("+4.8%", "#f5f5f7")], "#1d1d1f"),
        ([("&#8230;", "#86868b"), ("", "#f5f5f7"), ("", "#f5f5f7")], "#1d1d1f"),
        ([("11", "#86868b"), ("Energy", "#f5f5f7"), ("&#8722;3.1%", "#f5f5f7")], "#1d1d1f"),
        ([("", "#86868b"), ("Hold the top 3", "#30d158"), ("S&amp;P &gt; 10M", "#86868b")], "#141416"),
    ]
    p.append(M.table(368, 40, rows, widths=(22, 112, 60)))
    return M.svg("An illustrative mock of the indicator: momentum lines for four sectors in a lower pane with a red stretch marked T-bills where the trend filter is on, and a table ranking the sectors by momentum with the top three marked as held.", p)


SPEC = {
    "slug": "sector-rotation",
    "name": "Sector Rotation",
    "seo_title": "Sector Rotation by Momentum (Faber, Moskowitz and Grinblatt), Explained",
    "desc": "Sector rotation by relative strength: rank ten sectors on trailing return each month and hold the top three. Moskowitz and Grinblatt (1999) found much of stock momentum is industry momentum; Faber (2010) found top sectors beat buy and hold by about 3-6% a year back to the 1920s. With a trend filter for bear markets. Animated walkthroughs plus a free TradingView indicator.",
    "kicker": "Famous strategies &middot; ETFs &middot; Moskowitz &amp; Grinblatt 1999 &middot; Faber 2010",
    "h1": "Sector <span>Rotation</span>",
    "thesis": "Industries go through long runs of leading and lagging. Rank the sectors on what they've returned lately, own the top few, and swap out any that fall behind. No view on the economy needed: the ranking does the rotating.",
    "thesis_em": "Own the leaders, swap the laggards.",
    "counts": [("10", "sectors ranked each month"), ("3", "held, a third each"), ("3&ndash;6%", "a year over holding all ten, in Faber's test")],
    "ribbon": ["Month-end", "Rank ten sectors", "Hold the top three", "Swap any that drop out", "Optional: trend filter"],
    "facts": [
        ("research", "Moskowitz &amp; Grinblatt, Do Industries Explain Momentum?, <i>Journal of Finance</i>, 1999"),
        ("tested by", "Mebane Faber, Relative Strength Strategies for Investing, 2010"),
        ("data", "Ten US industry groups, back to the 1920s"),
        ("ranking", "Trailing total return, 1 to 12 months, or an average of several"),
        ("hold", "The top 1, 2 or 3, equal weights, monthly"),
        ("result", "About 3&ndash;6% a year over holding all ten, before costs"),
        ("hit rate", "Beat buy and hold in roughly 70% of years"),
        ("trend filter", "T-bills when the S&amp;P 500 is below its 10-month average"),
    ],
    "blocks": [
        {"type": "head", "id": "rank", "h2": "Rank and hold", "p": "The whole system is one ranking a month. Faber kept it deliberately plain so anyone could follow it with a list of sector funds."},
        {"type": "anim", "key": "rank", "title": "Ten sectors, top three", "aria": "Ten made-up sectors sorted by trailing return from plus 24.1% for Technology down to minus 4.3% for Utilities; the top three are held with a third of the money each and the other seven are dimmed."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "At each month-end, work out every sector's trailing total return. Faber's combined score averages the 1, 3, 6, 9 and 12-month returns.",
            "Hold the top three sectors, a third of the money in each.",
            "Next month-end, rank again. Sell any sector that dropped out of the top three and buy the one that replaced it.",
        ], "why": "Industries trend for months at a time as money, news and earnings revisions flow into them. Ranking on recent returns rides those trends without having to explain them."},
            "right": [
                panel("Two ways to rotate", "And which one this is.", pair(
                    ("yes", "momentum", "Follow the ranking", "Hold whatever has been strongest. This page, and the research behind it."),
                    ("care", "business cycle", "Forecast the economy", "Pick sectors by where you think the cycle is heading. Popular, but it needs a forecast, and there's no comparable test behind it."))),
                calc("The made-up ranking", "From the walkthrough above.", [("#1 Technology", "+24.1%"), ("#2 Energy", "+18.6%"), ("#3 Industrials", "+15.2%"), ("Held in each", "a third", "tot")]),
            ]},
        {"type": "head", "id": "rotate", "h2": "How it rotates", "p": "Trailing returns change slowly, so the top three do too. Most months nothing happens; now and then one leader fades and another takes its place."},
        {"type": "anim", "key": "rotate", "title": "Ranks over time", "aria": "Ten made-up sectors' ranks over nine months: Technology starts first and fades to seventh, while Financials and Materials climb into the top three; each entry into the top three is marked as a swap."},
        {"type": "head", "id": "industries", "h2": "Why industries", "p": "Moskowitz and Grinblatt asked where stock momentum comes from. Much of it, they found, comes from the industry a stock belongs to."},
        {"type": "anim", "key": "industries", "title": "Stocks move with their industry", "aria": "Ten made-up stocks over 40 months look unrelated until colored by industry: five in a hot industry rise together and five in a cold industry fall together."},
        {"type": "main", "stage": {"h3": "What the research found", "li": [
            "Industry momentum: buying stocks in recently winning industries and selling those in losing industries was strongly profitable.",
            "Controlling for industry momentum made individual-stock momentum much weaker; the reverse wasn't true.",
            "It held after controlling for size, book-to-market, individual stock momentum and microstructure effects.",
        ], "why": "If much of the momentum effect lives in industries, you can capture a large part of it with ten sector funds instead of hundreds of stocks."},
            "right": [
                qb("<b>Beat buy and hold in roughly 70% of years.</b> Faber's 2010 test of the top sectors, back to the 1920s: about 3 to 6 percentage points a year over an equal-weighted mix of all ten, before trading costs and taxes."),
            ]},
        {"type": "head", "id": "filter", "h2": "The bear-market problem", "p": "A ranking always picks something, even when everything is falling. Faber's answer was the same trend filter as his 10-month moving average rule."},
        {"type": "anim", "key": "filter", "title": "Adding a trend filter", "aria": "A made-up sector rotation falls with the market in a bear market; with a filter that holds T-bills while the S&P 500 is below its 10-month average, the filtered line steps aside for most of the decline and ends with a smaller worst drawdown."},
        {"type": "four", "cards": [
            ("#30d158", "edge", "3&ndash;6% a year", "Top sectors over holding all ten, in Faber's test back to the 1920s, before costs."),
            ("#2997ff", "consistency", "~70% of years", "The share of years the relative strength system beat buy and hold."),
            ("#f4b942", "with the filter", "40&ndash;50% drawdowns", "Instead of 70&ndash;80% without it, while keeping most of the return."),
            ("#ff453a", "the catch", "Concentrated", "Three sectors means big bets on a few groups. Bad stretches can last years."),
        ]},
        {"type": "timeline", "items": [
            ("#2997ff", "1993", "Stock momentum", "Jegadeesh and Titman: winners over the past 3 to 12 months keep winning."),
            ("#30d158", "1999", "Industry momentum", "Moskowitz and Grinblatt: much of that momentum comes from industries."),
            ("#2997ff", "1998&ndash;99", "Sector funds", "The Select Sector SPDR ETFs make it easy to hold a whole sector."),
            ("#f4b942", "2010", "Faber's test", "<i>Relative Strength Strategies for Investing</i>: ten industries back to the 1920s, top sectors and a trend filter."),
        ]},
    ],
    "steps": [
        {"h3": "Month-end", "li": ["On the last trading day, look up each sector's trailing total return.", "Pick one lookback and stick with it."], "why": "One check a month."},
        {"h3": "Rank", "li": ["Sort the sectors from best to worst.", "No forecasts, no opinions about the economy."], "why": "The ranking makes the call."},
        {"h3": "Hold", "li": ["Buy the top three, a third of the money in each.", "Hold them until the next month-end."], "why": "Ride the leaders."},
        {"h3": "Swap", "li": ["Sell any sector that dropped out of the top three.", "Buy the one that replaced it; leave the rest alone."], "why": "Few trades, low costs."},
        {"h3": "Filter", "li": ["Optional: if the S&amp;P 500 closed below its 10-month average, hold T-bills.", "Back into the top three when it closes above."], "why": "Step aside in long bear markets."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It ranks the eleven SPDR sector ETFs on momentum, marks the top three, applies Faber's optional trend filter, and alerts when the top set changes. It marks and alerts. It doesn't place trades.",
        "name": "Sector Rotation Rank",
        "blurbs": [
            "A ranking table of all eleven sector ETFs, best to worst, with the momentum score and the held sectors marked. The default score is Faber's combined lookback, the average of the 1, 3, 6, 9 and 12-month total returns; you can switch to a single lookback.",
            "In a pane under the chart: momentum lines for a few big sectors, with the background shaded red when the trend filter says T-bills. Alerts fire once a month when the top set changes, and when the filter turns on or off.",
            "<span style=\"color:var(--ash)\">Faber tested ten industry groups. The SPDR sector ETFs are the usual stand-ins today, with real estate and communication services added since. Scores use completed months and add dividends back.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Any chart works; the ranking is the same on every symbol and timeframe.",
            "To get alerted, create an alert on the chart and pick <b>Sectors: top set changed</b>, <b>Sectors: to T-bills</b> or <b>Sectors: back in</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/cross-sectional-momentum.html", "#30d158", "famous strategy", "Cross-Sectional Momentum", "The stock-level version of the same idea."),
        ("/famous-strategies/ten-month-sma.html", "#2997ff", "famous strategy", "10-Month Moving Average", "The trend filter on its own."),
        ("/famous-strategies/dual-momentum.html", "#f4b942", "famous strategy", "Dual Momentum", "Relative strength between whole markets, with bonds as the exit."),
        ("/famous-strategies/low-volatility.html", "#ff9f0a", "famous strategy", "Low-Volatility Anomaly", "Another way to choose what to own, by risk instead of return."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "On the last trading day of each month, rank the sector ETFs on one lookback and write down the top three. Track them for six months next to SPY, and count how many swaps you made.",
        "li": ["Use the same lookback every month.", "Write the ranking down before the next month starts.", "Note whether the trend filter would have been on."],
    },
    "sources": [
        "Moskowitz, T. J. &amp; Grinblatt, M. (1999). Do Industries Explain Momentum? <i>Journal of Finance</i>, 54(4), 1249&ndash;1290.<small>A strong momentum effect in industry returns; individual stock momentum much less profitable after controlling for industry momentum; industry momentum robust to size, book-to-market, individual momentum, cross-sectional dispersion and microstructure effects.</small>",
        "Faber, M. T. (2010). Relative Strength Strategies for Investing. Cambria Investment Management (SSRN 1585517).<small>Ten US industry groups ranked monthly on trailing total return (1 to 12 months and a combined 1-3-6-9-12 score), holding the top 1 to 3; about 300&ndash;600 basis points a year over buy and hold, beating it in roughly 70% of years; with a 10-month SMA filter on the S&amp;P 500, drawdowns of about 40&ndash;50% instead of 70&ndash;80%. Before taxes, commissions and slippage.</small>",
        "Jegadeesh, N. &amp; Titman, S. (1993). Returns to Buying Winners and Selling Losers. <i>Journal of Finance</i>, 48(1), 65&ndash;91.",
    ],
    "src": "Built from the papers listed above. Every return and rank in the walkthroughs is made up for illustration. The cards use the papers' published findings, which are backtests before trading costs and taxes. Past results don't promise future returns. It's shared for education, not as trading advice.",
    "market": "ETFs",
    "who": "Faber; Moskowitz, Grinblatt",
    "card": "Rank ten sectors on trailing return each month and hold the top three, with a trend filter for bear markets.",
}
