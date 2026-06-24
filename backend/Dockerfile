FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
RUN apk add --no-cache maven
COPY pom.xml .
RUN MAVEN_OPTS="-Xmx384m -Xms64m" mvn dependency:resolve -q --batch-mode
COPY src ./src
RUN MAVEN_OPTS="-Xmx384m -Xms64m" mvn package -DskipTests -q --batch-mode

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xms128m", "-Xmx400m", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
