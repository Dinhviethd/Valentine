FROM node:22-alpine

WORKDIR /BDS_FrontEnd

COPY package*.json . 

RUN npm i

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"] 