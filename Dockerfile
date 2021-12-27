FROM node:16
WORKDIR /app
COPY package*.json ./
COPY ./certificates ./certificates
COPY ./assets ./assets
COPY ./src ./src
COPY ./tsconfig.json ./
RUN ls
RUN npm install
RUN npm run build

EXPOSE 4000

CMD [ "node", "./bin/server.js" ]