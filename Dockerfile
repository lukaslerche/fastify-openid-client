FROM node:alpine AS build

RUN npm i -g pnpm

WORKDIR /app
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

COPY . .
RUN pnpm build


FROM node:alpine AS run

RUN npm i -g pnpm

WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile -P

COPY --from=build /app/app.js .

CMD ["node", "app.js"]
EXPOSE 3000/tcp