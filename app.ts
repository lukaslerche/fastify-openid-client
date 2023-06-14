import fastify from 'fastify';
import fastifyCors from '@fastify/cors';



const app = fastify();

app.register(fastifyCors, {
    origin: true // allow all origins
});



const start = async () => {
    try {
        await app.listen({ port:3000 , host: '0.0.0.0'});
        console.log(`Server running on http://0.0.0.0:3000`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
  
start();