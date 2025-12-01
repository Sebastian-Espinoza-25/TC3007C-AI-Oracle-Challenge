FROM python:3.11-slim

# Container directory
WORKDIR /backend

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Requirements file
COPY requirements.txt .

# Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire backend
COPY . .

# Expose port
EXPOSE 5000

# Make sure Oracle Wallet is accessible
ENV TNS_ADMIN=/backend/Wallet_OracleChallenge

# Start the application
CMD ["python", "run.py"]
