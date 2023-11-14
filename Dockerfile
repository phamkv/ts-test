FROM node:alpine

WORKDIR /app

COPY . .

RUN npm install

CMD node src/${SERVICE_NAME}/main.js
