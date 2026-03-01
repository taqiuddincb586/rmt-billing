FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# bust cache 2026-03-01
RUN VITE_API_URL=https://rmt-billing-backend-production.up.railway.app npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The key change is line 7 — the URL is now hardcoded directly into the build command itself:
```
RUN VITE_API_URL=https://rmt-billing-backend-production.up.railway.app npm run build
