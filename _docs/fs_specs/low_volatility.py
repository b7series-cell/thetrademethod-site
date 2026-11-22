from fs_build import panel, pair, calc, qb
import fs_mock as M
import random


def mock():
    random.seed(7)
    p = []
    v = [17 + 2 * random.random() + (3 if 40 < i < 55 else 0) for i in range(120)]
    med = [24 + random.uniform(-0.6, 0.6) + (4 if 40 < i < 55 else 0) for i in range(120)]
    X, Y = M.scale(v, 16, 352, 44, 296, 10, 34)
    p.append(M.r(X(0), 40, X(40) - X(0), 256, "#30d158", 0.13))
    p.append(M.r(X(56), 40, X(119) - X(56), 256, "#30d158", 0.13))
    for lv in (10, 20, 30):
        p.append(M.ln(16, Y(lv), 352, Y(lv), "#2c2c2e", 1))
        p.append(M.t(356, Y(lv) + 4, "%d%%" % lv, "#6e6e73", 10))
    p.append(M.pl([(X(i), Y(x)) for i, x in enumerate(med)], "#8e8e93", 1.4))
    p.append(M.pl([(X(i), Y(x)) for i, x in enumerate(v)], "#f4b942", 2.4))
    p.append(M.t(X(4), Y(v[4]) + 18, "this stock's volatility", "#f4b942", 11, "start", 700))
    p.append(M.t(X(4), Y(med[4]) - 8, "list median", "#8e8e93", 11, "start", 600))
    p.append(M.t(16, 24, "Low Vol &#183; daily &#183; 252-day window", "#86868b", 12))
    names = [("1", "Stock A", "13", "#173d24"), ("2", "Stock B", "15", "#173d24"), ("3", "This stock", "18", "#5b4a1f"), ("4", "Stock D", "19", "#173d24"),
             ("5", "Stock E", "20", "#173d24"), ("6", "Stock F", "22", "#1d1d1f"), ("&#8230;", "", "", "#1d1d1f"), ("18", "Stock R", "52", "#4a1d1b"),
             ("19", "Stock S", "61", "#4a1d1b"), ("20", "Stock T", "74", "#4a1d1b"), ("&#946;", "beta to SPY", "0.58", "#1d1d1f")]
    rows = [([("#", "#86868b"), ("Symbol", "#86868b"), ("Vol %", "#86868b")], "#141416")]
    rows += [([(a, "#86868b"), (b, "#f5f5f7"), (c, "#f5f5f7")], bg) for a, b, c, bg in names]
    p.append(M.table(380, 34, rows, widths=(24, 100, 40), rh=18))
    return M.svg("An illustrative mock of the indicator: a pane with the stock's annualized volatility in gold below the list median in gray, green backgrounds while it ranks among the five calmest, and a table ranking twenty stocks from calmest to wildest with this stock third, plus its beta to SPY.", p)


SPEC = {
    "slug": "low-volatility",
    "name": "Low-Volatility Anomaly",
    "seo_title": "Low-Volatility Anomaly and Betting Against Beta",
    "desc": "Calm, low-beta stocks have earned about as much as wild ones, with far less risk. The research, betting against beta, why it lasts, an indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; Ang, Hodrick, Xing and Zhang, 2006; Frazzini and Pedersen, 2014",
    "h1": "Low-Volatility <span>Anomaly</span>",
    "thesis": "Shouldn't riskier stocks pay more? In the data, the calmest stocks earned about as much as the wildest, and the noisiest did worst of all. Own the calm ones, rebalance on a schedule, and accept lagging in roaring rallies.",
    "thesis_em": "Less risk, not less return.",
    "counts": [("0.70 vs 0.28", "Sharpe ratio, lowest vs highest beta"), ("&minus;1.06%", "a month: noisiest fifth minus calmest"), ("0.78", "BAB Sharpe ratio, 1926&ndash;2012")],
    "ribbon": ["Measure volatility", "Rank calm to wild", "Hold the calmest", "Rebalance on schedule", "Expect to lag rallies"],
    "facts": [
        ("papers", "\"The Cross-Section of Volatility and Expected Returns\"; \"Betting Against Beta\""),
        ("authors", "Ang, Hodrick, Xing &amp; Zhang; Frazzini &amp; Pedersen"),
        ("published", "<i>Journal of Finance</i> 61(1), 2006; <i>Journal of Financial Economics</i> 111(1), 2014"),
        ("sample", "US stocks; BAB from 1926 to 2012"),
        ("signal", "Past volatility or beta"),
        ("trade", "Own low-risk stocks; or long low beta, short high beta, beta-neutral"),
        ("rebalance", "Monthly in the papers"),
        ("headline", "BAB: 0.70% a month, Sharpe ratio 0.78"),
    ],
    "blocks": [
        {"type": "head", "id": "line", "h2": "The line that should slope up", "p": "Every finance course draws the same picture: more risk, more expected return. The low-volatility anomaly is what happens when you check that picture against the data."},
        {"type": "anim", "key": "line", "title": "Flat, not rising", "aria": "Frazzini and Pedersen's ten beta groups: average excess returns of 0.91% a month for the lowest beta and 0.97% for the highest, nearly flat; CAPM alpha falling from 0.52% to minus 0.10%, and Sharpe ratio from 0.70 to 0.28."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "Measure each stock's risk over the past year: its volatility (how much it swings) or its beta (how much it moves with the market).",
            "Rank the list from calmest to wildest, and own the calmest group, spread across many names and sectors.",
            "Re-rank on a fixed schedule, monthly or quarterly, and trade as little as possible in between.",
        ], "why": "The long-short research version also shorts the wildest stocks and uses leverage to make the two sides match in beta. A single account usually just owns the calm side."},
            "right": [
                panel("Volatility or beta?", "Two ways to measure \"calm\", and they mostly agree.", pair(
                    ("yes", "volatility", "How much it swings", "The standard deviation of returns. Easy to compute for any stock or list."),
                    ("yes", "beta", "How much it moves with the market", "The papers' measure for betting against beta. High-beta stocks amplify the market's moves."))),
                calc("The beta deciles, 1926&ndash;2012", "Lowest vs highest beta group (Frazzini and Pedersen).", [("Excess return", "0.91% vs 0.97% a month"), ("CAPM alpha", "+0.52% vs &minus;0.10%"), ("Sharpe ratio", "0.70 vs 0.28", "tot")]),
            ]},
        {"type": "head", "id": "ivol", "h2": "The noisiest stocks did worst", "p": "Ang, Hodrick, Xing and Zhang looked at a different kind of risk: the swings that belong to the company alone, not to the market. The stocks with the most of it had strikingly bad returns."},
        {"type": "anim", "key": "ivol", "title": "Idiosyncratic volatility", "aria": "Two made-up stocks' daily residual returns over a month, one calm and one jumpy; then the paper's result: the noisiest fifth of stocks earned 1.06% a month less than the calmest fifth, or 1.31% after adjusting for the Fama-French factors."},
        {"type": "main", "stage": {"h3": "What the 2006 paper found", "li": [
            "Idiosyncratic volatility: the daily swings left over after the market, size and value factors, measured over the past month.",
            "Sorted into five groups and held for a month, the noisiest fifth earned 1.06% a month less than the calmest. After the Fama-French factors, 1.31% less.",
            "Exposure to market-wide volatility, which they also studied, didn't explain it.",
        ], "why": "If high volatility were a risk investors had to be paid for, the noisiest stocks would earn more. They earned less."},
            "right": [
                qb("<b>From the abstract:</b> \"stocks with high idiosyncratic volatility relative to the Fama and French (1993) model have abysmally low average returns.\""),
                panel("Two papers, one pattern", "Different risk measures, the same conclusion.", pair(
                    ("yes", "Ang et al. 2006", "Own-company noise", "The noisiest fifth trailed by about 1% a month."),
                    ("yes", "Frazzini &amp; Pedersen 2014", "Market beta", "High-beta stocks had the lowest alphas and Sharpe ratios."))),
            ]},
        {"type": "head", "id": "bab", "h2": "Betting against beta", "p": "Frazzini and Pedersen turned the pattern into a market-neutral factor: lever up the calm stocks, scale down the wild ones, and hold both so the market cancels out."},
        {"type": "anim", "key": "bab", "title": "Long $1.40, short $0.70", "aria": "A low-beta basket bought with about $1.40 and a high-beta basket shorted with about $0.70, each reaching a beta of 1; the betting-against-beta factor earned 0.70% a month with a Sharpe ratio of 0.78 from 1926 to 2012, 0.55% after size, value and momentum, and did badly when borrowing got tight."},
        {"type": "four", "cards": [
            ("#30d158", "return", "0.70% a month", "BAB's average excess return in US stocks, 1926&ndash;2012, with a Sharpe ratio of 0.78."),
            ("#2997ff", "after factors", "0.55% a month", "Still left after the market, size, value and momentum factors."),
            ("#f4b942", "the mechanics", "Long ~$1.40, short ~$0.70", "The average position needed to make both sides a beta of 1."),
            ("#ff453a", "the risk", "Funding squeezes", "BAB did badly when borrowing got harder, measured by the TED spread."),
        ]},
        {"type": "head", "id": "why", "h2": "Why it lasts, and what it costs", "p": "An anomaly this old needs a reason to survive. The research gives three, and every one of them is about how investors are constrained or judged, not about a mistake that will be fixed tomorrow."},
        {"type": "anim", "key": "why", "title": "Three reasons, and the price", "aria": "Three explanation cards: leverage limits, benchmarks and lottery-ticket buying; then a made-up low-volatility portfolio lagging the market in a rally and losing less in a fall."},
        {"type": "timeline", "items": [
            ("#2997ff", "1972", "Black, Jensen &amp; Scholes", "Early tests find the line between beta and return flatter than the theory says."),
            ("#30d158", "2006", "Ang, Hodrick, Xing &amp; Zhang", "The noisiest stocks have \"abysmally low\" returns."),
            ("#2997ff", "2011", "Baker, Bradley &amp; Wurgler", "Benchmarked fund managers have reasons to avoid low-beta stocks."),
            ("#30d158", "2014", "Frazzini &amp; Pedersen", "Betting against beta works in US stocks since 1926, and in other markets."),
            ("#ff9f0a", "Since", "Low-vol funds", "Low-volatility and minimum-variance ETFs make the tilt easy to own, and more crowded."),
        ]},
    ],
    "steps": [
        {"h3": "Measure", "li": ["Each stock's volatility of daily returns over the past year, or its beta to the market.", "Use the same window for every stock."], "why": "Past risk is a good guide to future risk, much better than past returns are to future returns."},
        {"h3": "Rank", "li": ["Sort the list from calmest to wildest.", "Bigger lists give the effect more room to show up."], "why": "It's a ranking, like momentum and value."},
        {"h3": "Hold", "li": ["Own the calmest group, a third or a fifth of the list.", "Spread it over many names; calm stocks bunch in a few sectors."], "why": "Watch for too much in utilities and staples at once."},
        {"h3": "Rebalance", "li": ["Re-rank monthly or quarterly.", "Trade only the names that move out of the group."], "why": "Low turnover keeps costs down."},
        {"h3": "Expect", "li": ["It will lag in strong rallies, sometimes for years.", "It should lose less in falls."], "why": "The lagging is why the edge is still there."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It ranks the chart's stock against a list of up to 19 others on volatility over the past year, shows its beta to SPY, and alerts when it moves into or out of the calmest group. It marks and alerts. It doesn't place trades.",
        "name": "Low-Volatility Rank",
        "blurbs": [
            "A pane under your chart with the stock's annualized volatility (gold) against the median of your list (gray). The background turns green while the stock ranks among the calmest N of the list.",
            "A table ranks the whole list from calmest to wildest: the calmest N in green, the wildest N in red, the chart's stock highlighted, and its beta to the benchmark at the bottom. It ships with 19 large US stocks, from utilities to chip makers.",
            "<span style=\"color:var(--ash)\">Volatility is the standard deviation of daily log returns over the lookback, annualized. Every number is a setting: the lookback, how many count as calm, the benchmark and the list.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a daily chart of a US stock. Replace the list in the settings with your own universe.",
            "To get alerted, create an alert on the chart and pick <b>Moved into the calmest</b> or <b>Left the calmest</b>.",
        ],
    },
    "related": [
        ("/famous-strategies/value-and-size.html", "#30d158", "famous strategy", "Value and Size", "The same paper series that found beta's line flat in 1963&ndash;1990."),
        ("/famous-strategies/cross-sectional-momentum.html", "#2997ff", "famous strategy", "Cross-Sectional Momentum", "Another ranking strategy, with very different crash risk."),
        ("/dynamic-risk-sizing.html", "#f4b942", "risk", "Dynamic Risk Sizing", "Volatility as a sizing tool, not just a stock filter."),
        ("/famous-strategies/pairs-trading.html", "#ff9f0a", "famous strategy", "Pairs Trading", "Another market-neutral idea built on two legs."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Take 30 large stocks, rank them on one-year volatility, and write down the calmest ten. Track them against the S&amp;P 500 for a year, re-ranking each quarter. Note how they did in the months the market fell, and the months it ripped.",
        "li": ["Fix the list, the window and the rebalance dates first.", "Check sector weights each quarter.", "Write down what you'll do if it lags a hot market for a year."],
    },
    "sources": [
        "Ang, A., Hodrick, R. J., Xing, Y., &amp; Zhang, X. (2006). The cross-section of volatility and expected returns. <i>Journal of Finance</i>, 61(1), 259&ndash;299. <a class=\"cite-link\" href=\"https://doi.org/10.1111/j.1540-6261.2006.00836.x\" target=\"_blank\" rel=\"noopener\">DOI &rsaquo;</a><small>Idiosyncratic volatility from the past month of daily residuals, the quintile spread of &minus;1.06% a month raw and &minus;1.31% Fama-French alpha, \"abysmally low\", and the aggregate volatility test.</small>",
        "Frazzini, A., &amp; Pedersen, L. H. (2014). Betting against beta. <i>Journal of Financial Economics</i>, 111(1), 1&ndash;25. <a class=\"cite-link\" href=\"https://doi.org/10.1016/j.jfineco.2013.10.005\" target=\"_blank\" rel=\"noopener\">DOI &rsaquo;</a><small>US stocks 1926&ndash;2012, beta deciles (excess return 0.91% vs 0.97%, CAPM alpha 0.52% vs &minus;0.10%, Sharpe 0.70 vs 0.28), BAB construction (about $1.40 long, $0.70 short), 0.70% a month, Sharpe 0.78, 0.55% four-factor alpha, and the TED spread result.</small>",
        "Baker, M., Bradley, B., &amp; Wurgler, J. (2011). Benchmarks as limits to arbitrage: Understanding the low-volatility anomaly. <i>Financial Analysts Journal</i>, 67(1), 40&ndash;54.",
        "Black, F., Jensen, M. C., &amp; Scholes, M. (1972). The capital asset pricing model: Some empirical tests. In M. C. Jensen (Ed.), <i>Studies in the Theory of Capital Markets</i>. Praeger.",
    ],
    "src": "Built from the papers listed above. The figures quoted from them are labelled as such on the charts. Every stock, return series and portfolio path in the walkthroughs is made up for illustration. The indicator ranks a list you choose on past volatility, a simple version of what the papers test. Past results from these studies don't promise future returns. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "Ang et al., 2006; Frazzini & Pedersen, 2014",
    "card": "Calm, low-beta stocks have earned about as much as wild ones, and far more per unit of risk.",
}
