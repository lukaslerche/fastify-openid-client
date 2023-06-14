import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySecureSession from '@fastify/secure-session';
import { Issuer, generators } from 'openid-client';
import { config } from 'dotenv';
config();

const session_secret = process.env.SESSION_SECRET;
const session_salt = process.env.SESSION_SALT;
const discovery_url = process.env.DISCOVERY_URL;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const callback_url = process.env.CALLBACK_URL;

if (!session_secret || !session_salt || !discovery_url || !client_id || !client_secret || !callback_url) {
    throw new Error('Missing environment variables');
}

const myVar = process.env.MY_VAR;
const anotherVar = process.env.ANOTHER_VAR;

const app = fastify();

app.register(fastifyCors, {
    origin: true // allow all origins
});

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
            response_types: ['code'],
        });

        app.get('/login', async (request, reply) => {
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

        await app.listen({ port:3000 , host: '0.0.0.0'});
        console.log(`Server running on http://0.0.0.0:3000`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
  
start();