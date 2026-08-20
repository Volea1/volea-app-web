FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV PORT=80
COPY --from=build /app ./
EXPOSE 80
CMD ["npm", "run", "start"]
