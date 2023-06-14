# auth

A simple auth REST service, that can be deployed with Docker.

`GET /login` redirects to the login URI

`GET /callback` is called by the oAuth flow after the user has logged in

## Configuration

Configuration is done via environment variables:
- `SESSION_SECRET` - session secret to sign the session cookie
- `SESSION_SALT` - session salt to sign the session cookie
- `DISCOVERY_URL` - the discovery URL of the oAuth provider
- `CLIENT_ID` - the client ID of the oAuth client
- `CLIENT_SECRET` - the client secret of the oAuth client
- `REDIRECT_URL` - the callback URL of the oAuth client

