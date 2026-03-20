FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源码
COPY src ./src
COPY public ./public

# 构建生产版本
RUN npm run build

# Nginx生产镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
