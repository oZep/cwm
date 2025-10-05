FROM node:latest

WORKDIR /srv

COPY package.json .
COPY package-lock.json .
RUN npm install 

COPY . . 

CMD npm run dev