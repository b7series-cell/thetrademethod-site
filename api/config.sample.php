<?php
/* Copy this file to api/config.php ON THE SERVER and fill it in.
   Never paste your real key into chat, email, or a file you share. */
return [
    // Your Massive API key (dashboard → API keys).
    'api_key'       => 'PASTE_YOUR_MASSIVE_API_KEY',

    // false = private preview: the chart only loads with ?preview=<token> below.
    // Set true ONLY once your Massive account is on a Business subscription —
    // Individual plans cover your own viewing, not showing data to visitors.
    'public'        => false,

    // Any long random string. Open the page as
    //   https://thetrademethod.com/setups/volume-profile-system.html?preview=<this>
    // once; your browser remembers it after that.
    'preview_token' => 'CHANGE-ME-to-a-long-random-string',

    // Symbols the charts may request. ['*'] allows any ticker (the live charts
    // have a symbol box); a short list keeps requests to known names.
    'symbols'       => ['QQQ', 'SPY'],

    // Seconds a fetched response is reused before calling Massive again.
    'cache_seconds' => 30,

    // Shown under the chart. Starter/Developer plans are 15-minute delayed.
    'delay_note'    => 'Delayed 15 minutes',

    // How far behind real time the data runs, in seconds. The live charts use it
    // to tell a finished candle from one still forming. 0 on a real-time plan.
    'delay_seconds' => 900,
];
