FROM node:latest AS builder

WORKDIR /srv

COPY package.json .
COPY package-lock.json .
RUN npm install 

COPY . . 

RUN npm run build


FROM node:latest AS runner

WORKDIR /srv

COPY --from=builder /srv/dist /srv/dist

COPY --from=builder /srv/backend /srv/backend

RUN npm init -y
RUN npm pkg set type="module"

RUN npm install yjs lib0 y-protocols y-websocket ws

ENV HOST=0.0.0.0
ENV PORT=10000
ENV SRVPORT=8080

CMD node ./backend/server.js

