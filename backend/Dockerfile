FROM node:18-alpine AS build

WORKDIR /app

# bcrypt necesita python y make para compilar
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# bcrypt necesita estas dependencias en runtime
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/main.js"]

