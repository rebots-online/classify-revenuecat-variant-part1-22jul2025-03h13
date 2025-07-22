# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Docker / Cloud Run

To build and run the container locally:

```bash
docker build -t classify-app .
docker run -p 8080:8080 -e GEMINI_API_KEY=YOUR_KEY classify-app
```

For Google Cloud Run or other platforms, deploy the built image and set the `GEMINI_API_KEY` environment variable. The container listens on port `8080`.
