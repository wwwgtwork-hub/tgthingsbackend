  FROM node:22-alpine AS builder
  
  WORKDIR /app
  

  COPY package*.json ./
  

  RUN npm ci
  

  COPY . .
  

  RUN npm prune --production
  

  FROM node:22-alpine
  
  ENV NODE_ENV=production
  
  WORKDIR /app
  

  COPY --from=builder /app .
  

  COPY --from=builder /app/node_modules ./node_modules
  

  USER node
  
  EXPOSE 8080
  
  CMD ["node", "app.js"]
  