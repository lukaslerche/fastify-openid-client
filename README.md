# fastify-openid-client

A simple oAuth REST service to support Authorization Code Grant flow and Resource Owner Password Credentials flow.
It can be deployed with Docker.

## Endpoints

`GET /` returns the the landing page served from `templates/index.hbs`

`GET /login` redirects to the login URI for Authorization Code Grant flow

`GET /callback` is called by the Authorization Code Grant flow after the user has logged in

`GET /logout` is called to logout the user in Authorization Code Grant flow with query parameter `refresh_token` and `issuerLogoutURL`

`POST /loginext` is called with form parameters `user` and `password` for Resource Owner Password Credentials flow

`GET /logoutext` is called to logout the user logout in Resource Owner Password Credentials flow with query parameter `refresh_token`

## Configuration

Configuration is done via environment variables

### Cookies
- `SESSION_SECRET` - session secret to sign the session cookie
- `SESSION_SALT` - session salt to sign the session cookie

### Authorization Code Grant flow
- `DISCOVERY_URL` - the discovery URL of the oAuth provider for Authorization Code Grant flow
- `CLIENT_ID` - the client ID of the oAuth client for Authorization Code Grant flow
- `CLIENT_SECRET` - the client secret of the oAuth client for Authorization Code Grant flow
- `REDIRECT_URL` - the callback URL of the oAuth client for Authorization Code Grant flow

### Resource Owner Password Credentials flow
- `DISCOVERY_URL_ROPC` - the discovery URL of the oAuth provider for Resource Owner Password Credentials flow
- `CLIENT_ID_ROPC` - the client ID of the oAuth client for Resource Owner Password Credentials flow
- `CLIENT_SECRET_ROPC` - the client secret of the oAuth client for Resource Owner Password Credentials flow

### General
- `LOGOUT_REDIRECT_URL` - the URL to redirect to after logout

