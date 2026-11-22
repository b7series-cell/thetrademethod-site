from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    keys = [(0, 0.1), (25, -0.8), (55, 2.3), (70, 1.0), (85, -0.1), (110, -1.2), (140, -2.2), (165, -0.9), (180, 0.2), (199, 0.6)]
    def tr(i):
        for k in range(1, len(keys)):
            if i <= keys[k][0]:
                a, b = keys[k - 1], keys[k]
                return a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0])
        return keys[-1][1]
    import random
    random.seed(4)
    z = [tr(i) + random.uniform(-0.18, 0.18) for i in range(200)]
    X, Y = M.scale(z, 16, 352, 40, 296, -3, 3)
    p = []
    o1 = next(i for i, v in enumerate(z) if v >= 2)
    c1 = next(i for i in range(o1, 200) if z[i] <= 0)
    o2 = next(i for i in range(c1, 200) if z[i] <= -2)
    c2 = next(i for i in range(o2, 200) if z[i] >= 0)
    p.append(M.r(X(o1), 40, X(c1) - X(o1), 256, "#ff453a", 0.13))
    p.append(M.r(X(o2), 40, X(c2) - X(o2), 256, "#30d158", 0.13))
    p.append(M.ln(16, Y(0), 352, Y(0), "#8e8e93", 1, "4 4"))
    p.append(M.ln(16, Y(2), 352, Y(2), "#ff453a", 1))
    p.append(M.ln(16, Y(-2), 352, Y(-2), "#30d158", 1))
    pts = [(X(i), Y(v)) for i, v in enumerate(z)]
    p.append(M.pl(pts, "#2997ff", 2))
    p.append(M.pl(pts[o1 - 3:o1 + 4], "#f4b942", 2.4))
    p.append(M.pl(pts[o2 - 3:o2 + 4], "#f4b942", 2.4))
    p.append('<path d="M%.1f 30 l-6 -10 h12z" fill="#ff453a"/>' % X(o1))
    p.append('<path d="M%.1f 304 l-6 10 h12z" fill="#30d158"/>' % X(o2))
    p.append('<circle cx="%.1f" cy="%.1f" r="4" fill="#f5f5f7"/><circle cx="%.1f" cy="%.1f" r="4" fill="#f5f5f7"/>' % (X(c1), Y(z[c1]), X(c2), Y(z[c2])))
    p.append(M.t(16, 24, "Pairs Z &#183; PEP vs KO &#183; daily", "#86868b", 12))
    p.append(M.t(356, Y(2) + 4, "+2", "#ff453a", 10))
    p.append(M.t(356, Y(-2) + 4, "&#8722;2", "#30d158", 10))
    p.append(M.t((X(o1) + X(c1)) / 2, Y(2.6), "short A, buy B", "#ff453a", 10.5, "middle", 700))
    p.append(M.t((X(o2) + X(c2)) / 2, Y(-2.6) + 8, "buy A, short B", "#30d158", 10.5, "middle", 700))
    rows = [
        ([("Partner (B)", "#86868b"), ("NYSE:KO", "#f5f5f7")], "#1d1d1f"),
        ([("Correlation", "#86868b"), ("0.82", "#f5f5f7")], "#1d1d1f"),
        ([("Z-score now", "#86868b"), ("0.61", "#f5f5f7")], "#1d1d1f"),
        ([("Position", "#86868b"), ("flat", "#f5f5f7")], "#1d1d1f"),
        ([("Days held", "#86868b"), ("-", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(378, 40, rows, widths=(92, 80)))
    return M.svg("An illustrative mock of the indicator: a pane with the pair's z-score in blue between lines at plus and minus 2, a red-shaded trade opened at plus 2 (short A, buy B) and closed when the z-score crossed zero, a green-shaded trade opened at minus 2, and a table showing the partner, correlation, z-score and position.", p)


SPEC = {
    "slug": "pairs-trading",
    "name": "Pairs Trading",
    "seo_title": "Pairs Trading Strategy (Gatev et al.), Explained",
    "desc": "Match stocks that moved together for a year; when they split by two standard deviations, short the leader, buy the laggard. Results and an indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; Gatev, Goetzmann and Rouwenhorst, <i>Review of Financial Studies</i>, 2006",
    "h1": "Pairs <span>Trading</span>",
    "thesis": "Two stocks have moved together for a year. When one suddenly runs ahead of the other, does the gap close again? Short the one that ran, buy the one that lagged, and close both when their prices cross.",
    "thesis_em": "Bet on the gap, not the market.",
    "counts": [("12 + 6", "months to form the pairs, then to trade them"), ("2&sigma;", "the gap that opens a trade"), ("~11%", "a year, the paper's best version")],
    "ribbon": ["Normalize prices", "Find the closest partner", "Watch the gap", "Open at two sigma", "Close at the cross"],
    "facts": [
        ("paper", "\"Pairs Trading: Performance of a Relative-Value Arbitrage Rule\""),
        ("authors", "Evan Gatev, William Goetzmann &amp; K. Geert Rouwenhorst"),
        ("published", "<i>Review of Financial Studies</i> 19(3), 2006, pp. 797&ndash;827"),
        ("sample", "Liquid US stocks, 1962&ndash;2002"),
        ("signal", "Gap of 2 standard deviations between normalized prices"),
        ("trade", "Short the leader, buy the laggard, a dollar each"),
        ("exit", "Prices cross, or the 6-month period ends"),
        ("headline", "Up to about 11% a year above the risk-free rate"),
    ],
    "blocks": [
        {"type": "head", "id": "match", "h2": "Finding the pairs", "p": "The paper doesn't pick pairs by industry or story. It lets twelve months of prices decide: every stock is matched with the one whose price line stayed closest to its own."},
        {"type": "anim", "key": "match", "title": "The closest partner", "aria": "Made-up normalized prices for Stock A and four candidates over twelve months: the squared gap to each candidate is added up, and Stock B, with the smallest total distance, becomes A's partner."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Formation: take twelve months of daily total returns for every stock and start each line at $1.",
            "Match each stock with the partner whose line has the smallest sum of squared gaps from its own. Rank all pairs by that distance and keep the closest 5 or 20.",
            "Trading: for the next six months, open a pair when the gap reaches two standard deviations (of the gap in the formation year), and close it when the prices cross. Anything still open after six months is closed.",
        ], "why": "A new formation and trading cycle starts every month, so at any time six overlapping portfolios are running. The paper reports their average."},
            "right": [
                panel("Distance, not correlation", "Two common ways to pick pairs, and the one the paper used.", pair(
                    ("yes", "the paper", "Smallest distance", "The sum of squared gaps between normalized prices. Simple, and it picks stocks that actually traded at the same level."),
                    ("care", "later research", "Cointegration", "A statistical test that the spread itself tends to revert. More complex, and the subject of a lot of later work."))),
                calc("A pair, in dollars", "The paper's position is a dollar long and a dollar short.", [("Short Stock A (the leader)", "&minus;$10,000"), ("Buy Stock B (the laggard)", "+$10,000"), ("Net market exposure", "about $0", "tot")]),
            ]},
        {"type": "head", "id": "trade", "h2": "Opening and closing a trade", "p": "Once the pair is fixed, there's only one number to watch: how far apart the two prices are, compared with how far apart they usually were."},
        {"type": "anim", "key": "trade", "title": "Open at 2&sigma;, close at the cross", "aria": "A made-up six-month trading period: Stock A runs two standard deviations ahead of Stock B, the trade shorts A and buys B, and closes when the prices cross; a second trade opens when A falls two standard deviations behind and is closed at the end of the period without crossing."},
        {"type": "main", "stage": {"h3": "What can happen to an open pair", "li": [
            "The gap closes and the prices cross: close both legs for a profit. This is the trade the rule is built for.",
            "The gap never closes within the six months: the position is closed at the end, at a gain or a loss.",
            "One stock is delisted, merged or acquired: the paper closed the pair at the last price or delisting return. These are the trades that hurt.",
        ], "why": "The rule never cuts a loser because the gap widened. Wider gaps are, by the rule's logic, better entries. That's the strategy's main risk."},
            "right": [
                qb("<b>Wait a day.</b> The paper's base case trades the day <i>after</i> the gap hits two standard deviations, not on the same close. Signals on the same close are partly bid-ask bounce: the price you see isn't one you could have traded."),
                calc("The paper's portfolios", "Average pairs traded per six-month period.", [("Top 5", "4.81 pairs"), ("Top 20", "19.3 pairs"), ("Round trips per pair", "about 2"), ("Average time open", "about 3.75 months", "tot")]),
            ]},
        {"type": "head", "id": "results", "h2": "What the paper found", "p": "Forty years of US stocks, a new cycle every month, and every rule fixed in advance. The returns were steady, and most of them survived the authors' own attempts to explain them away."},
        {"type": "anim", "key": "results", "title": "The paper's returns", "aria": "Average monthly excess returns from the paper: same-day signals earned 1.31% for the top 5 pairs and 1.44% for the top 20; waiting one day cut them to about 0.75% and 0.90%; costs were estimated at about 1.6% per pair round trip."},
        {"type": "four", "cards": [
            ("#2997ff", "returns", "Up to ~11% a year", "Above the risk-free rate, for the base case that waits a day before trading."),
            ("#30d158", "risk", "Close to market neutral", "Market betas were near zero, and the returns weren't explained by the usual risk factors."),
            ("#f4b942", "costs", "About 1.6% a round trip", "The paper's estimate per pair. Profits stayed significant after it, but it's a big share of the edge."),
            ("#ff453a", "decline", "Smaller after the 1980s", "Returns fell in the later part of the sample as more hedge funds traded the same idea."),
        ]},
        {"type": "head", "id": "neutral", "h2": "Market neutral is not risk free", "p": "Being long one stock and short its twin takes the market out of the trade. It leaves the risk that the two stop being twins."},
        {"type": "anim", "key": "neutral", "title": "When the market falls", "aria": "A made-up market drop of about 20% against a pairs book that barely moves, a made-up dip where one pair breaks apart, and a note that profits shrank after the late 1980s."},
        {"type": "timeline", "items": [
            ("#2997ff", "1980s", "Morgan Stanley", "A quantitative group led by Nunzio Tartaglia trades pairs, according to the paper's own history of the idea."),
            ("#30d158", "1999", "Working paper", "Gatev, Goetzmann and Rouwenhorst first circulate the study."),
            ("#30d158", "2006", "Review of Financial Studies", "The published paper: 1962&ndash;2002, top 5 and top 20 pairs, up to 11% a year."),
            ("#ff453a", "Later", "More competition", "The edge in the simple version shrinks as more traders run it. Later studies test cointegration and other ways to pick pairs."),
        ]},
    ],
    "steps": [
        {"h3": "Form", "li": ["Twelve months of daily total returns for every stock you can trade.", "Start every line at $1."], "why": "Now a $20 stock and a $200 stock can be compared."},
        {"h3": "Match", "li": ["For each stock, the partner with the smallest sum of squared gaps.", "Rank all pairs and keep the closest 5 or 20."], "why": "The price history picks the pairs, not a story."},
        {"h3": "Watch", "li": ["For the next six months, track the gap between the two lines.", "Measure it in the standard deviations it had during the formation year."], "why": "One number per pair."},
        {"h3": "Open", "li": ["At two standard deviations, short the one that ran and buy the one that lagged, a dollar of each.", "The paper trades the day after the signal."], "why": "You're betting on the gap, not the market."},
        {"h3": "Close", "li": ["When the prices cross, close both legs.", "If they haven't crossed when the six months end, close anyway."], "why": "Then the next month's pairs take over."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). Put it on one stock and give it the partner: it tracks the gap between the two as a z-score, marks when it reaches two standard deviations and when it comes back, and alerts on both. It marks and alerts. It doesn't place trades.",
        "name": "Pairs Trading Spread",
        "blurbs": [
            "A pane under your chart with the pair's z-score: the log of this stock's price divided by the partner's, compared with its average over the formation window (252 days by default), in standard deviations. Lines at +2 and &minus;2 are the open levels.",
            "At +2 a red marker says short this stock and buy the partner; at &minus;2 a green one says the reverse. The trade stays shaded until the z-score crosses back through 0 (a white dot) or the maximum holding time runs out (an orange cross). A table shows the partner, their correlation, the z-score and the position.",
            "<span style=\"color:var(--ash)\">It's the common practical version, a rolling z-score of the price ratio, not the paper's fixed 12-month formation and 6-month trading periods. Every number is a setting: the partner, the window, the open and close levels, and the maximum hold.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Open a daily chart of one stock, then in the indicator's settings pick its partner (it ships with KO, for a PEP chart).",
            "To get alerted, create an alert on the chart and pick <b>Open: short A, buy B</b>, <b>Open: buy A, short B</b> or <b>Close the pair</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/cross-sectional-momentum.html", "#30d158", "famous strategy", "Cross-Sectional Momentum", "The opposite bet: buy what has run and short what has lagged."),
        ("/famous-strategies/post-earnings-drift.html", "#2997ff", "famous strategy", "Post-Earnings Drift", "Another long-short stock strategy, built on earnings surprises instead of price gaps."),
        ("/auction-market-theory.html", "#f4b942", "fundamentals", "Auction Market Theory", "Mean reversion on one chart: wall to wall inside balance."),
        ("/dynamic-risk-sizing.html", "#ff9f0a", "risk", "Dynamic Risk Sizing", "How much to put on each pair when the edge is small and steady."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Pick five pairs of similar large stocks (two soda makers, two railroads, two home-improvement chains). Add the indicator to each and write down every open and close signal for three months, with the prices the day after. Count the ones that never crossed.",
        "li": ["Fix the window and the open level before you start.", "Note the borrow cost of every short leg.", "Write down what you'll do if one of the pair gets news."],
    },
    "sources": [
        "Gatev, E., Goetzmann, W. N., &amp; Rouwenhorst, K. G. (2006). Pairs trading: Performance of a relative-value arbitrage rule. <i>Review of Financial Studies</i>, 19(3), 797&ndash;827. <a class=\"cite-link\" href=\"https://doi.org/10.1093/rfs/hhj020\" target=\"_blank\" rel=\"noopener\">DOI &rsaquo;</a><small>The rule (12-month formation, smallest sum of squared deviations, open at two standard deviations, close at the crossing, 6-month trading period), 1962&ndash;2002, 1.31% / 1.44% a month same day and about 0.75% / 0.90% waiting one day, up to 11% a year, the cost estimate, the pair counts and holding time, the near-zero betas, and the smaller returns later in the sample.</small>",
    ],
    "src": "Built from Gatev, Goetzmann and Rouwenhorst's 2006 paper. The figures quoted from the paper are labelled as such on the charts. Every stock, price path, gap and portfolio line in the walkthroughs is made up for illustration. The indicator uses a rolling z-score of the price ratio, a common practical version that the paper didn't test. Short selling has its own costs and risks, including borrow fees and recalls. Past results from this study don't promise future returns. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "Gatev, Goetzmann & Rouwenhorst, 2006",
    "card": "Match stocks that moved together for a year; when they split by two standard deviations, short the leader and buy the laggard.",
}
