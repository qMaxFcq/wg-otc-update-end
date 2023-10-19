## Runner ##
FROM node:18.17.1-bullseye-slim AS runner
LABEL mantainer="Thammarong Glomjai <thammarong.g@siamintech.co.th>"

WORKDIR /usr/src/app

# Building app
COPY package.json package-lock.json* /usr/src/app/

# Install node modules
# Note: We also install dev deps as TypeScript may be needed
RUN npm ci

# Copy files. Use dockerignore to avoid copying node_modules
COPY . .

# Expose port
EXPOSE 3000

CMD ["node", "src/main.js"]
