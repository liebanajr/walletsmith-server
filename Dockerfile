FROM node:16
WORKDIR /app
COPY package*.json ./
COPY ./certificates ./certificates
COPY ./src ./src
COPY ./tsconfig.json ./
RUN ls
RUN npm install
RUN npm run build

ENV port=4080
ENV httpPort=4000
ENV ENV=dev
ENV LOGLEVEL=silly
ENV LOGFORMAT=color

EXPOSE 4000 4080

CMD [ "node", "./bin/server.js" ]