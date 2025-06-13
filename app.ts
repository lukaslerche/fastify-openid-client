import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySecureSession from '@fastify/secure-session';
import fastifyFormBofy from '@fastify/formbody';
import fastifyView from '@fastify/view';
import * as handlebars from 'handlebars';
import { Issuer, generators } from 'openid-client';
import { config } from 'dotenv';
config(); // load environment variables from .env file

const session_secret = process.env.SESSION_SECRET;
const session_salt = process.env.SESSION_SALT;

const discovery_url = process.env.DISCOVERY_URL;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const callback_url = process.env.CALLBACK_URL;

const discovery_url_ropc = process.env.DISCOVERY_URL_ROPC;
const client_id_ropc = process.env.CLIENT_ID_ROPC;
const client_secret_ropc = process.env.CLIENT_SECRET_ROPC;

const logout_redirect_url = process.env.LOGOUT_REDIRECT_URL;

declare module '@fastify/secure-session' {
  interface SessionData {
    code_verifier: string;
  }
}

if (!session_secret || !session_salt || !discovery_url || !client_id || !client_secret || !callback_url || !client_id_ropc || !client_secret_ropc || !logout_redirect_url || !discovery_url_ropc) {
    throw new Error('Missing environment variables');
}

const app = fastify();

app.register(fastifyCors, {
    origin: true // allow all origins
});

// to store the session data for ACG flow in a cookie, we need to register the plugin
app.register(fastifySecureSession, {
    secret: session_secret,
    salt: session_salt,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: true,
    },
});

app.register(fastifyFormBofy);

// register a helper to stringify objects
handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
});



// register the templateing engine
app.register(fastifyView, {
    engine: {
      handlebars,
    },
  });

const start = async () => {
    try {
        app.get("/", (req, reply) => {
            reply.view("/templates/index.hbs", { 
                discovery_url: discovery_url,
                client_id: client_id,
                callback_url: callback_url,
                discovery_url_ropc: discovery_url_ropc,
                client_id_ropc: client_id_ropc,
                logout_redirect_url: logout_redirect_url
             });
          });

        const issuer = await Issuer.discover(discovery_url);

        const client = new issuer.Client({
            client_id: client_id,
            client_secret: client_secret,
            redirect_uris: [callback_url],
            //post_logout_redirect_uris: [logout_redirect_url],
        });

        // login for the Authorization Code Grant flow
        app.get('/login', (request, reply) => {
            const code_verifier = generators.codeVerifier();
            request.session.code_verifier = code_verifier;

            const code_challenge = generators.codeChallenge(code_verifier);

            const authorizationUrl = client.authorizationUrl({
                scope: 'openid email profile',
                code_challenge,
                code_challenge_method: 'S256',
              });
            reply.redirect(authorizationUrl);
        });

        // callback for the Authorization Code Grant flow
        app.get('/callback', async (request, reply) => {
            const params = client.callbackParams(request.raw);
            const code_verifier = request.session.code_verifier;
            const tokenSet = await client.callback(
                callback_url,
                params,
                { code_verifier }
            );

            console.log('received and validated tokens %j', tokenSet);
            console.log('validated ID Token claims %j', tokenSet.claims());

            const userinfo = await client.userinfo(tokenSet);
            console.log('userinfo %j', userinfo);

            const issuerLogoutURL = client.endSessionUrl({id_token_hint: tokenSet.id_token});
            const encodedIssuerLogoutURL = encodeURIComponent(issuerLogoutURL);
            console.log('logoutRedirectUrl: ' + issuerLogoutURL);

            //reply.send({tokenSet: tokenSet, userinfo: userinfo, logoutURL: '/logout?refresh_token=' + tokenSet.refresh_token + '&issuerLogoutURL=' + encodedIssuerLogoutURL});
            return reply.view("/templates/loggedin.hbs", {
                tokenSet: tokenSet,
                userinfo: userinfo,
                logoutURL: '/logout?refresh_token=' + tokenSet.refresh_token + '&issuerLogoutURL=' + encodedIssuerLogoutURL
            });
        });

        const issuerExt = await Issuer.discover(discovery_url_ropc);
        
        const clientExt = new issuerExt.Client({
            client_id: client_id_ropc,
            client_secret: client_secret_ropc
        });

        app.get('/logout', async (request, reply) => {
            const { refresh_token, issuerLogoutURL } = request.query as { refresh_token: string, issuerLogoutURL: string };

            try {
                await client.revoke(refresh_token);

                // Call issuerLogoutURL and succeed on 204
                if (issuerLogoutURL) {
                    const decodedIssuerLogoutURL = decodeURIComponent(issuerLogoutURL);
                    const response = await fetch(decodedIssuerLogoutURL, { method: 'GET' });
                    if (response.status === 204) {
                        console.log('Logout successful');
                    } else {
                        console.error('Logout failed with status code ' + response.status);
                    }
                }

                //reply.send({ message: 'refresh_token revoked successfully and called issuerLogoutURL', redirectUrl: logout_redirect_url });
                return reply.view("/templates/loggedout.hbs", {
                    message: 'refresh_token revoked successfully and called issuerLogoutURL',
                    redirectUrl: logout_redirect_url
                });
            } catch (err) {
                console.error(err);
                reply.status(500).send({ error: 'Failed to revoke tokens and call issuerLogoutURL' });
            }
        });


        // login for the Resource Owner Password Credentials Grant flow
        app.post('/loginext', async (request, reply) => {
            const { user, password } = request.body as { user: string, password: string };
            try {
                const tokenSet = await clientExt.grant({
                    grant_type: 'password',
                    username: user,
                    password: password,
                    scope: 'eduPersonAffiliation givenname sn uid',
                });

                console.log('received and validated tokens %j', tokenSet);
                //console.log('validated ID Token claims %j', tokenSet.claims());

                const userinfo = await clientExt.userinfo(tokenSet);
                console.log('userinfo %j', userinfo);

                //reply.send({tokenSet: tokenSet, userinfo: userinfo, logoutURL: '/logoutext?refresh_token=' + tokenSet.refresh_token});
                return reply.view("/templates/loggedin.hbs", {
                    tokenSet: tokenSet,
                    userinfo: userinfo,
                    logoutURL: '/logoutext?refresh_token=' + tokenSet.refresh_token
                });
            } catch (err) {
                console.error(err);
                reply.status(401).send({ error: 'Invalid credentials' });
            }
        });

        // logout for the Resource Owner Password Credentials Grant flow
        app.get('/logoutext', async (request, reply) => {
            const { refresh_token } = request.query as { refresh_token: string };

            try {
                //await clientExt.revoke(access_token);
                await clientExt.revoke(refresh_token);

                //reply.send({ message: 'refresh_token revoked successfully', redirectUrl: logout_redirect_url });
                return reply.view("/templates/loggedout.hbs", {
                    message: 'refresh_token revoked successfully',
                    redirectUrl: logout_redirect_url
                });
            } catch (err) {
                console.error(err);
                reply.status(500).send({ error: 'Failed to revoke tokens' });
            }
        });

        await app.listen({ port:3000 , host: '0.0.0.0'});
        console.log(`Server running on http://0.0.0.0:3000`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
  
start();