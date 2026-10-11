# ---------- 1) Front-end (React + Vite) ----------
FROM node:22-alpine AS front
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
# No Railway o site e a API ficam no mesmo endereço, então a API é relativa.
ENV VITE_API_URL=/api/v1
RUN npm run build

# ---------- 2) Back-end (Spring Boot) já servindo o front ----------
FROM maven:3.9-eclipse-temurin-25 AS back
WORKDIR /build
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY src ./src
COPY --from=front /app/src/main/resources/static ./src/main/resources/static
RUN mvn -q -B -DskipTests package

# ---------- 3) Imagem final ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=back /build/target/inpetu-connect-1.0.0.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Sao_Paulo"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
