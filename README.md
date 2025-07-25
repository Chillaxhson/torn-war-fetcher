# Torn War Target Fetcher

(AI written README)

This is a simple  tool for tracking war targets in Torn City. It gives you a clean, real-time list of who to hit, when they're out of the hospital, and a button to do the deed.

## What You'll Need

-   [Node.js](https://nodejs.org/) (v18 or newer)
-   [Docker](https://www.docker.com/products/docker-desktop/)

## How to Get it Running

You've got two options. The Docker way is the fastest and recommended. Do the local dev setup only if you plan on changing the code.

### Option 1: The Docker Way (Recommended)

This is the easiest and most professional path. It uses Docker Compose to build and run the entire application in a self-contained environment, based on the configuration in `docker-compose.yml`.

**1. Build and Run the Container**
In the project's root directory, run this single command. It will build the image if it doesn't exist and start the container in the background.

```bash
docker-compose up -d --build
```

That's it. The app is running. Open your browser and go to **[http://localhost:3000](http://localhost:3000)**.

**Managing the Container**

-   **To view the logs:**
    ```bash
    docker-compose logs -f
    ```

-   **To stop the application:**
    ```bash
    docker-compose down
    ```

### Option 2: The Local Dev Way (For Tinkerers)

Use this method if you want to mess with the code. You'll need to run the backend and frontend in two separate terminals.

**1. Install Dependencies**
First, install all the project packages.

```bash
npm install
```

**2. Run the Backend**
In your first terminal, start the API server.

```bash
npm run dev:backend
```
This will run on `http://localhost:3000`.

**3. Run the Frontend**
In a second terminal, start the Vite dev server.

```bash
npm run dev
```
Vite will spit out a URL, probably `http://localhost:5173`. Open that one in your browser. It will automatically talk to the backend server.

## How to Use It

1.  **API Key**: The first time you open the app, paste your Torn API key into the input field. It'll save it in your browser's local storage so you don't have to do it again.
2.  **Faction ID**: Enter the ID of the faction you want to track.
3.  **Fetch Targets**: Click the button. The list will populate and start auto-refreshing. 
