import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySecureSession from '@fastify/secure-session';
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
const jwk_url = process.env.JWK_URL;

if (!session_secret || !session_salt || !discovery_url || !client_id || !client_secret || !callback_url || !client_id_ropc || !client_secret_ropc || !jwk_url || !discovery_url_ropc) {
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

const start = async () => {
    try {
        const issuer = await Issuer.discover(discovery_url);

        const client = new issuer.Client({
            client_id: client_id,
            client_secret: client_secret,
            redirect_uris: [callback_url],
        });

        // login for the Authorization Code Grant flow
        app.get('/login', async (request, reply) => {
            const code_verifier = generators.codeVerifier();
            request.session.code_verifier = code_verifier;

            const code_challenge = generators.codeChallenge(code_verifier);

            const authorizationUrl = client.authorizationUrl({
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


            reply.send({tokenSet: tokenSet, userinfo: userinfo});
        });

        const issuerExt = await Issuer.discover(discovery_url_ropc);
        
        const clientExt = new issuerExt.Client({
            client_id: client_id_ropc,
            client_secret: client_secret_ropc
        });

        // login for the Resource Owner Password Credentials Grant flow
        app.get('/loginext', async (request, reply) => {
            const { user, password } = request.query as { user: string, password: string };

            try {
                const tokenSet = await clientExt.grant({
                    grant_type: 'password',
                    username: user,
                    password: password,
                });

                console.log('received and validated tokens %j', tokenSet);
                //console.log('validated ID Token claims %j', tokenSet.claims());

                const userinfo = await clientExt.userinfo(tokenSet);
                console.log('userinfo %j', userinfo);

                reply.send({tokenSet: tokenSet, userinfo: userinfo});
            } catch (err) {
                console.error(err);
                reply.status(401).send({ error: 'Invalid credentials' });
            }
        })


        await app.listen({ port:3000 , host: '0.0.0.0'});
        console.log(`Server running on http://0.0.0.0:3000`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
  
start();