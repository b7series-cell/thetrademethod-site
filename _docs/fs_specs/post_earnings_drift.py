from fs_build import panel, pair, calc, qb
import fs_mock as M


def mock():
    vals = M.walk(90, 50, lambda i: 0.02 if i < 30 else 0.16, 0.9, 11, shocks={30: 6.5})
    X, Y = M.scale(vals, 18, 352, 46, 290)
    p = []
    p.append(M.r(X(30) - 3, 40, X(89) - X(30) + 6, 256, "#30d158", 0.13))
    p.append(M.candles(vals, X, Y, seed=5, w=2.6))
    p.append(M.ln(X(30), Y(vals[29]), 352, Y(vals[29]), "#86868b", 1, "4 4"))
    p.append(M.r(X(30) - 46, Y(min(vals[28:32])) + 18, 92, 34, "#30d158", 0.95, 6))
    p.append(M.t(X(30), Y(min(vals[28:32])) + 32, "Beat +14%", "#fff", 11, "middle", 700))
    p.append(M.t(X(30), Y(min(vals[28:32])) + 46, "score 2.3", "#fff", 11, "middle", 600))
    p.append(M.t(X(60), 60, "drift window", "#30d158", 11, "middle", 700))
    p.append(M.t(18, 24, "PEAD &#183; daily", "#86868b", 12))
    rows = [
        ([("Last surprise", "#86868b"), ("+14.0%", "#f5f5f7")], "#1d1d1f"),
        ([("Score (SUE-style)", "#86868b"), ("2.3", "#f5f5f7")], "#1d1d1f"),
        ([("Days since report", "#86868b"), ("59", "#f5f5f7")], "#1d1d1f"),
        ([("Stock since report", "#86868b"), ("+21.4%", "#f5f5f7")], "#1d1d1f"),
        ([("vs benchmark", "#86868b"), ("+17.9 pts", "#30d158")], "#173d24"),
        ([("Window", "#86868b"), ("drift up", "#f5f5f7")], "#1d1d1f"),
    ]
    p.append(M.table(368, 40, rows, widths=(116, 60)))
    return M.svg("An illustrative mock of the indicator: a made-up daily chart with a big earnings beat labelled Beat +14% score 2.3, the stock gapping up, a green drift window shading the next 60 days, and a table showing the stock up 21.4% since the report and 17.9 points ahead of the benchmark.", p)


SPEC = {
    "slug": "post-earnings-drift",
    "name": "Post-Earnings Drift",
    "seo_title": "Post-Earnings Announcement Drift (PEAD), Explained",
    "desc": "After a big earnings surprise, stocks keep drifting the same way for weeks. How the surprise is scored, how much the drift faded, and an indicator.",
    "kicker": "Famous strategies &middot; Stocks &middot; Bernard and Thomas, <i>Journal of Accounting Research</i>, 1989",
    "h1": "Post-Earnings <span>Drift</span>",
    "thesis": "Does a stock that blows out its earnings keep going after the first day? Score every company's surprise against its own history, buy the biggest beats, short the biggest misses, and hold for about a quarter.",
    "thesis_em": "The news takes weeks to sink in.",
    "counts": [("41 of 48", "quarters the long-short made money, 1974&ndash;85"), ("~60 days", "the hold: about one quarter"), ("25&ndash;30%", "of the drift lands at the next reports")],
    "ribbon": ["Know the forecast", "Score the surprise", "Sort into tenths", "Long beats, short misses", "Hold about a quarter"],
    "facts": [
        ("paper", "\"Post-Earnings-Announcement Drift: Delayed Price Response or Risk Premium?\""),
        ("authors", "Victor Bernard &amp; Jacob Thomas"),
        ("published", "<i>Journal of Accounting Research</i> 27 (Supplement), 1989, pp. 1&ndash;36"),
        ("first seen", "Ball &amp; Brown, 1968"),
        ("signal", "Standardized unexpected earnings (SUE)"),
        ("trade", "Long the top SUE decile, short the bottom"),
        ("hold", "About 60 trading days, through the next report"),
        ("headline", "Long-short positive in 41 of 48 quarters, 1974&ndash;1985"),
    ],
    "blocks": [
        {"type": "head", "id": "surprise", "h2": "The idea in one picture", "p": "Every quarter a company reports earnings, and the market already has a number in mind. The strategy only cares about the gap between the two, and how unusual that gap is for this particular company."},
        {"type": "anim", "key": "surprise", "title": "Scoring the surprise", "aria": "A made-up company with a forecast of $1.00 a share reports $1.18. The 18-cent surprise is divided by the company's usual miss of 6 cents, giving a SUE of 3, and every company is sorted into ten groups by its SUE."},
        {"type": "main", "stage": {"h3": "The rule", "li": [
            "When a company reports, measure its surprise: reported earnings minus what was expected.",
            "Divide by how much this company's earnings usually miss the forecast. That's the standardized unexpected earnings, or SUE.",
            "Each quarter, sort every company that reported into ten groups by SUE. Buy the top group (biggest beats), sell short the bottom group (biggest misses), and hold for about a quarter.",
        ], "why": "There's no chart reading in the original. The surprise picks the stocks and the calendar picks the exit, which is why it could be tested over thousands of reports."},
            "right": [
                panel("Two ways to measure \"expected\"", "The papers and the traders don't use the same forecast.", pair(
                    ("yes", "the paper", "Last year, plus growth", "Bernard and Thomas forecast each quarter from the same quarter a year earlier, plus the company's usual growth. No analysts needed."),
                    ("care", "today", "The analysts' consensus", "Most data feeds and screeners, and the indicator below, compare reported EPS with the consensus estimate instead."))),
                calc("The made-up example", "How one report turns into a score.", [("Forecast", "$1.00"), ("Reported", "$1.18"), ("Surprise", "+$0.18"), ("Usual miss for this company", "$0.06"), ("SUE", "+3.0", "tot")]),
            ]},
        {"type": "head", "id": "drift", "h2": "The drift", "p": "If prices took in earnings news at once, the line after a report would go flat. Bernard and Thomas lined up thousands of reports and found it doesn't: the good news keeps rising and the bad news keeps falling, for weeks."},
        {"type": "anim", "key": "drift", "title": "60 days after the report", "aria": "Made-up abnormal-return paths for ten surprise groups over 60 trading days: the top groups keep rising and the bottom groups keep falling, and the strategy buys group 10 and shorts group 1."},
        {"type": "main", "stage": {"h3": "What the paper found", "li": [
            "The long-short position (top tenth of SUE minus bottom tenth) made money in 41 of 48 quarters from 1974 to 1985.",
            "It was positive in 11 of the 16 quarters when the NYSE index fell, so it wasn't just riding the market.",
            "The drift was larger in smaller companies, and a big share of it arrived around the next three earnings reports.",
        ], "why": "The paper's title asks the real question: is the drift a reward for some hidden risk, or are prices just slow? Their evidence pointed to slow prices."},
            "right": [
                qb("<b>Older than momentum.</b> Ball and Brown saw it first, in 1968: returns kept moving in the direction of the earnings news after the report. Bernard and Thomas turned it into a strategy and tried to explain it away with risk. They couldn't."),
                panel("Delayed reaction or risk?", "The two explanations the paper tested.", pair(
                    ("care", "risk premium", "You're paid for risk", "If the drift were pay for extra risk, the long-short would lose in bad markets. It made money in 11 of 16 down quarters."),
                    ("yes", "delayed response", "Prices are slow", "Investors under-react to the news and catch up over the next weeks and reports. The paper's evidence favored this."))),
            ]},
        {"type": "head", "id": "next", "h2": "Why it jumps at the next report", "p": "Bernard and Thomas's 1990 follow-up asked where the drift happens. A surprising amount of it lands in a few days: right around the company's next earnings reports."},
        {"type": "anim", "key": "next", "title": "Jumps at the next reports", "aria": "A made-up long-short return path over three quarters after a report, rising in steps at the next three earnings dates, with the earnings autocorrelations 0.34, 0.19, 0.06 and minus 0.24."},
        {"type": "main", "stage": {"h3": "Earnings surprises repeat", "li": [
            "A beat this quarter tends to be followed by smaller beats in the same direction over the next three quarters, then a partial reversal a year out.",
            "Prices act as if investors expect next quarter to look like the same quarter last year, missing that the surprise will partly repeat.",
            "So when the next report confirms it, the stock jumps again. About 25&ndash;30% of the drift fell in the 3-day windows around the next reports, roughly 5% of the trading days.",
        ], "why": "That's why the hold runs through the next report. Exit just before it and you skip one of the biggest pieces."},
            "right": [
                calc("How surprises carry forward", "Correlation of this quarter's seasonal earnings change with the next four (Bernard and Thomas, 1990).", [("Next quarter", "0.34"), ("Two quarters on", "0.19"), ("Three quarters on", "0.06"), ("Four quarters on", "&minus;0.24", "tot")]),
                qb("<b>The paper's title says it plainly:</b> \"Evidence that stock prices do not fully reflect the implications of current earnings for future earnings.\""),
            ]},
        {"type": "head", "id": "fade", "h2": "It has faded", "p": "Post-earnings drift is one of the most studied anomalies in finance. That's a problem for anyone hoping to trade the plain version today."},
        {"type": "anim", "key": "fade", "title": "A famous anomaly gets smaller", "aria": "The spread between the highest and lowest SUE groups shown falling from about 5% in the 1980s and 1990s to 3% or less by the late 2010s, as reported by Kettell, McInnis and Zhao."},
        {"type": "timeline", "items": [
            ("#2997ff", "1968", "Ball &amp; Brown", "Returns keep moving in the direction of the earnings news after the report: the first sighting."),
            ("#30d158", "1989", "Bernard &amp; Thomas", "The long-short SUE strategy, positive in 41 of 48 quarters, and not explained by risk."),
            ("#30d158", "1990", "Bernard &amp; Thomas", "The drift bunches up around the next reports, because surprises repeat and prices don't expect it."),
            ("#ff453a", "2022", "Kettell, McInnis &amp; Zhao", "The top-minus-bottom SUE spread falls from about 5% to 3% or less, partly because surprises repeat less than they used to."),
        ]},
        {"type": "head", "id": "trade", "h2": "A version a single account can run", "p": "The papers trade every company at once. Traders usually take one name at a time: a big surprise, with price agreeing with the news, held for weeks rather than minutes."},
        {"type": "anim", "key": "trade", "title": "One stock, one report", "aria": "A made-up stock drifts sideways into earnings, gaps up on a big beat and closes near the high, is bought after the report with a stop under the report-day low, and is held for weeks as it drifts higher."},
        {"type": "four", "cards": [
            ("#2997ff", "rule one", "Only big surprises", "Small beats and misses are noise. Set the size that counts, as a score or a percent, before the report."),
            ("#30d158", "rule two", "Price has to agree", "A beat that gaps up and holds is the setup. A beat the stock sells off is the market telling you something else."),
            ("#ff9f0a", "rule three", "Hold through the next report", "A big piece of the drift arrives at the next earnings date. Decide in advance whether you're holding through it."),
            ("#ff453a", "rule four", "Expect less than the paper", "The spread has roughly halved since the 1990s. Count costs, and size it like an edge that's smaller than it used to be."),
        ]},
    ],
    "steps": [
        {"h3": "Know the forecast", "li": ["Before the report, know what was expected: the consensus estimate, or last year's same quarter plus growth.", "Write down what size of surprise you'll act on."], "why": "The plan comes before the number."},
        {"h3": "Score the surprise", "li": ["Surprise = reported minus expected.", "Divide by how much this company usually misses. A score of 1 or more is a big surprise for this company."], "why": "Eight cents is huge for a steady utility and nothing for a chip maker."},
        {"h3": "Sort", "li": ["In the paper: every company that reported this quarter, sorted into ten groups by score.", "For one account: only the reports in the top or bottom of your list."], "why": "The edge is in the extremes, not the middle."},
        {"h3": "Trade", "li": ["Buy the biggest beats. The paper also shorts the biggest misses.", "Traders often wait for price to confirm: a gap that holds into the close."], "why": "Long-only is simpler, and it's what most accounts run."},
        {"h3": "Hold", "li": ["About a quarter (60 trading days) in the research, through the next report.", "Or set a stop under the report-day low and trail it under higher lows."], "why": "The drift is weeks long. Don't take it off in the first hour."},
    ],
    "indicator": {
        "note": "One TradingView script for this strategy (Pine Script v6). It reads TradingView's own earnings data, scores each surprise against the company's recent history, shades the drift window that follows a big beat or miss, and tracks the stock against SPY since the report. It marks and alerts. It doesn't place trades.",
        "name": "Post-Earnings Drift",
        "blurbs": [
            "A label on every report: beat or miss, the surprise as a percent of the estimate, and a SUE-style score (this surprise divided by the spread of the last 8 surprises). A big beat shades the next 60 trading days green, a big miss red.",
            "A table on the right tracks the latest report: the surprise, the score, days since, the stock's move since the day before the report, and how far ahead of or behind the benchmark (SPY by default) it is.",
            "<span style=\"color:var(--ash)\">It uses the consensus estimate, not the paper's seasonal forecast. Every number is a setting: how many surprises feed the score, what counts as big, the window length and the benchmark. Alerts fire on a big beat or a big miss.</span>",
        ],
        "mock": mock(),
        "howto": [
            "Copy the code below, or download the .pine file.",
            "In TradingView, open the Pine Editor at the bottom of a chart, paste it in, and click <b>Add to chart</b>.",
            "Use a daily chart of a stock that reports earnings. ETFs and indexes have no earnings, so nothing will show.",
            "To get alerted, create an alert on the chart and pick <b>Big beat</b> or <b>Big miss</b> under this indicator.",
        ],
    },
    "related": [
        ("/trading-earnings.html", "#2997ff", "fundamentals", "How to Trade Earnings", "Reading the headline reaction, the call and the price confirmation on report day."),
        ("/famous-strategies/cross-sectional-momentum.html", "#30d158", "famous strategy", "Cross-Sectional Momentum", "The other big \"prices are slow\" anomaly: winners keep winning for months."),
        ("/relative-volume.html", "#f4b942", "fundamentals", "Relative Volume", "How to tell a report-day move with real participation from a quiet one."),
        ("/six-momentum-trades.html", "#ff9f0a", "fundamentals", "Six Momentum Trades", "Chart entries for the weeks after the gap: pullbacks, retests and continuation."),
    ],
    "rule": {
        "h2": "Try it on paper first.",
        "p": "Pick the 20 biggest beats of the next earnings season, scored against each company's own history. Note the close the day after each report, and check them against SPY at 20, 40 and 60 trading days. Do it again next season before putting money on it.",
        "li": ["Decide what counts as a big surprise before the season starts.", "Note which ones held the gap and which faded it.", "Write down whether you'd hold through the next report."],
    },
    "sources": [
        "Bernard, V. L., &amp; Thomas, J. K. (1989). Post-earnings-announcement drift: Delayed price response or risk premium? <i>Journal of Accounting Research</i>, 27 (Supplement), 1&ndash;36.<small>The SUE decile strategy, 41 of 48 quarters, 11 of 16 down-market quarters, larger drift in small firms, and the drift around the next three reports.</small>",
        "Bernard, V. L., &amp; Thomas, J. K. (1990). Evidence that stock prices do not fully reflect the implications of current earnings for future earnings. <i>Journal of Accounting and Economics</i>, 13(4), 305&ndash;340.<small>About 25&ndash;30% of the drift in the 3-day windows around the next reports, and the autocorrelations 0.34, 0.19, 0.06 and &minus;0.24.</small>",
        "Ball, R., &amp; Brown, P. (1968). An empirical evaluation of accounting income numbers. <i>Journal of Accounting Research</i>, 6(2), 159&ndash;178.",
        "Kettell, McInnis &amp; Zhao (2022), research on the decline of post-earnings announcement drift.<small>The high-minus-low SUE spread falling from about 5% in the 1980s and 1990s to 3% or less by the late 2010s.</small>",
    ],
    "src": "Built from Bernard and Thomas's 1989 and 1990 papers and the research listed above. The figures quoted from the papers are labelled as such on the charts. Every company, earnings number, score and price path in the walkthroughs is made up for illustration, including the shapes of the drift lines. Past results from these studies don't promise future returns, and the one-stock, price-confirmed version shown here is a simplification the original papers didn't test. It's shared for education, not as trading advice.",
    "market": "Stocks",
    "who": "Bernard & Thomas, 1989",
    "card": "After a big earnings surprise, stocks keep drifting the same way for weeks, with jumps at the next reports.",
}
