# Bakes the Keycloakify theme JAR into the image. Keycloak keeps provider JARs
# memory-mapped; serving them from a macOS bind mount leads to
# "ZipFile invalid LOC header" errors (the admin console's "Failed to load
# themes" banner), so the JAR is copied in at build time instead.
FROM quay.io/keycloak/keycloak:26.8.0
COPY providers/*.jar /opt/keycloak/providers/
