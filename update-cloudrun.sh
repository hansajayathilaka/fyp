#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# Check if required variables are set
if [ -z "$GCP_PROJECT_ID" ] || [ -z "$GCP_REGION" ] || [ -z "$REGISTRY" ] || [ -z "$TAG" ]; then
    echo "Error: Missing required environment variables!"
    echo "Please ensure GCP_PROJECT_ID, GCP_REGION, REGISTRY, and TAG are set in .env file"
    exit 1
fi

# Define services and their corresponding Cloud Run service names
declare -A SERVICES=(
    ["issuer-backend"]="issuer-backend"
    ["issuer-frontend"]="issuer-frontend"
    ["verifier-backend"]="verifier-backend"
    ["verifier-frontend"]="verifier-frontend"
    ["smart-contracts-ui"]="smart-contracts-ui"
)

echo "Updating Cloud Run services with new images..."
echo "Project: $GCP_PROJECT_ID"
echo "Region: $GCP_REGION"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "----------------------------------------"

# Function to update a single Cloud Run service
update_service() {
    local service_name=$1
    local image_name=$2
    local full_image_url="${REGISTRY}/${image_name}:${TAG}"
    
    echo "Updating $service_name with image: $full_image_url"
    
    gcloud run deploy $service_name \
        --image=$full_image_url \
        --project=$GCP_PROJECT_ID \
        --region=$GCP_REGION \
        --quiet
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully updated $service_name"
    else
        echo "❌ Failed to update $service_name"
        return 1
    fi
    echo "----------------------------------------"
}

# Update all services
failed_services=()
for service_name in "${!SERVICES[@]}"; do
    cloudrun_service_name="${SERVICES[$service_name]}"
    if ! update_service $cloudrun_service_name $service_name; then
        failed_services+=($cloudrun_service_name)
    fi
done

# Summary
echo "Deployment Summary:"
if [ ${#failed_services[@]} -eq 0 ]; then
    echo "✅ All services updated successfully!"
else
    echo "❌ Failed to update the following services:"
    for service in "${failed_services[@]}"; do
        echo "  - $service"
    done
    exit 1
fi