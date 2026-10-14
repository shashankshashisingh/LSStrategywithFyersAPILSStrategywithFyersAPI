# Ten

A long/short portfolio tool. Upload a monthly sheet, rank the companies on a metric you choose (PEG, PE, ROE or any other column), go long the best ten and short the worst ten, and get the trades to make each month. It tracks brokerage, STT and a borrow fee on shorts, and shows portfolio statistics and a trade ledger.

The whole app is the single file `index.html`.

## Saving your data

By default the page saves to the browser you use. To save to an account instead (so it works across devices and survives clearing site data), connect a free Supabase project:

1. Create a project at supabase.com.
2. Open **SQL Editor**, paste the contents of `supabase-setup.sql`, and run it.
3. In **Authentication -> Providers -> Email**, keep email sign-in on. For the simplest sign-up, turn off "Confirm email".
4. In **Project Settings -> API**, copy the **Project URL** and the **anon public key**.
5. In `index.html`, find the line `var SUPABASE_URL = "", SUPABASE_ANON_KEY = "";` and put the two values between the quotes. The anon key is meant to be public: the database rules in step 2 make each user's data readable only by that user.
6. Commit. The page now asks you to sign in and saves your portfolio to your account.

Never put the `service_role` key in this file.

## Live prices (Fyers API)

Live prices are fetched from Fyers through the Supabase Edge Function, so your Fyers credentials are never sent to the browser.

1. In your Fyers developer app, make sure market-data API access is enabled and generate a valid access token.
2. In Supabase, open **Edge Functions -> Secrets** (or use the Supabase CLI) and set:
   - `FYERS_APP_ID`: your Fyers app/client ID, typically in the `APPID-100` format.
   - `FYERS_ACCESS_TOKEN`: the current Fyers access token, without the app ID prefix.
3. Deploy `supabase/functions/dynamic-service/index.ts` as the `dynamic-service` Edge Function. Keep **Verify JWT** enabled.
4. In the app, open **Live price settings**, enter the NSE equity symbol for each position (for example `RELIANCE`, `TCS`, or `M&M`), and select automatic refresh if desired.
5. Refresh the prices. The app can refresh every minute while the NSE market is open and the page remains open.

**Important:** Fyers access tokens expire and must be renewed according to Fyers' authentication rules. Update the `FYERS_ACCESS_TOKEN` secret when you generate a new token. Do not put your app secret or access token in `index.html`, client-side JavaScript, or a public repository. The quote endpoint is for market data only; it does not place trades.
