
# Power Stats

Simple application for seeing statistics for your Tibber subscription.

Lists estimated costs, "strømstøtte", price and consume per day.

## Development

* Create a `.env` file and fil in:

  ```sh
  TIBBER_ACCESS_KEY=<access-key> # can be found at [Tibber docs](https://developer.tibber.com/docs/guides/calling-api)
  USERNAME=<some-username> # For basic auth
  PASSWORD=<some-password> # For basic auth
  DATABASE_URL="file:./dev.db" # For accessing sqlite db
  ```

    Tibber access token can be found at [Tibber docs](https://developer.tibber.com/docs/guides/calling-api).

* Create the local cache database:
  ```sh
  npx prisma db push
  ```
* Start dev server:
  ```sh
  npm run dev
  ```

    This starts your app in development mode, rebuilding assets on file changes.


### Tibber

Check out [Tibber api](https://developer.tibber.com/explorer).
