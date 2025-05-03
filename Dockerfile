# NOT USED - use github actions instead
FROM mcr.microsoft.com/playwright/python:v1.52.0-noble

WORKDIR /app

# Install additional dependencies
RUN apt-get update && \
    apt-get install -y poppler-utils && \
    rm -rf /var/lib/apt/lists/*

# Copy the entire repository
COPY . .

# Install Python dependencies
RUN pip install -r requirements.txt

CMD ["python", "get_pdfs.py"]
