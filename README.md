# auth

A simple auth REST service, that can be deployed with Docker.

`GET /login` redirects to the login URI

`GET /callback` is called by the oAuth flow after the user has logged in

## Configuration

Configuration is done via environment variables:
### Cookies
- `SESSION_SECRET` - session secret to sign the session cookie
- `SESSION_SALT` - session salt to sign the session cookie

### General oAuth
- `DISCOVERY_URL` - the discovery URL of the oAuth provider

### Authorization Code Grant flow
- `CLIENT_ID` - the client ID of the oAuth client for Authorization Code Grant flow
- `CLIENT_SECRET` - the client secret of the oAuth client for Authorization Code Grant flow
- `REDIRECT_URL` - the callback URL of the oAuth client for Authorization Code Grant flow

### Resource Owner Password Credentials flow
- `CLIENT_ID_ROPC` - the client ID of the oAuth client for Resource Owner Password Credentials flow
- `CLIENT_SECRET_ROPC` - the client secret of the oAuth client for Resource Owner Password Credentials flow
- `JWK_URL` - the URL to retrieve the JSON Web Key Set (JWKS) for verifying the signature of ID tokens for Resource Owner Password Credentials flow


