#!/bin/bash

echo "🚀 Deploying to Google App Engine..."
gcloud app deploy app.yaml --quiet

echo "✅ Done! Your backend is live."
