FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY src ./src

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["node", "src/index.js"]
