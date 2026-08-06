<<<<<<< HEAD
FROM node:22-alpine AS builder
  

WORKDIR /app


COPY package*.json ./


RUN npm ci

COPY . .


RUN rm -rf node_modules && npm ci --only=production



FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app


COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app .


USER node


EXPOSE 8080


CMD ["node", "app.js"]
=======
  FROM node:22-alpine AS builder
  

  WORKDIR /app


  COPY package*.json ./


  RUN npm ci
  

  COPY . .
  

  RUN rm -rf node_modules && npm ci --only=production
  
  

  FROM node:22-alpine
  
  ENV NODE_ENV=production
  
  WORKDIR /app
  

  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/package*.json ./
  COPY --from=builder /app .
  

  USER node
  

  EXPOSE 8080
  

  CMD ["node", "app.js"]
  
>>>>>>> 3444895c47c7088aa0224bbbce1cf793ea6fa78c
