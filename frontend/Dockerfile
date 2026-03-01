FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

**Fix 3: Railway frontend Variables** — go to Railway → **rmt-billing-frontend** → **Variables** → add:
```
VITE_API_URL=https://rmt-billing-backend-production.up.railway.app/api/v1
