FROM node:20-alpine

WORKDIR /app

COPY apps/web/package*.json /app/apps/web/
WORKDIR /app/apps/web
RUN npm ci

COPY apps/web /app/apps/web

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
