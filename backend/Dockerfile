FROM python:3.11-slim

# Workdir inside container
WORKDIR /backend

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire backend
COPY . .

# Environment variables
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0

# Oracle Wallet and OCI config
ENV TNS_ADMIN=/backend/Wallet_OracleChallenge
ENV OCI_CONFIG_FILE=/backend/.oci/config
ENV OCI_PROFILE=DEFAULT

# Expose backend port
EXPOSE 5000

# Start production server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "120", "run:app"]

