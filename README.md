# Torn War Target Fetcher

(AI written README cuz I'm way too lazy.)

This is a simple  tool for tracking war targets in Torn City. It gives you a clean, real-time list of who to hit, when they're out of the hospital, and a button to do the deed.

## What You'll Need

-   [Node.js](https://nodejs.org/) (v18 or newer)
-   [Docker](https://www.docker.com/products/docker-desktop/)

## How to Get it Running

You've got two options. The Docker way is the fastest and recommended. Do the local dev setup only if you plan on changing the code.

### Option 1: The Docker Way (Recommended)

This is the easiest path. It builds and runs the entire application in a self-contained environment.

**1. Build the Image**
In the project's root directory, run this command. It'll build the Docker image and tag it as `torn-fetcher`.

```bash
docker build -t torn-fetcher .
```

**2. Run the Container**
Now, start the container. This command runs it in the background (`-d`), maps port 3000, and gives it a memorable name.

```bash
docker run -p 3000:3000 -d --name "Torn War Fetcher" torn-fetcher
```

That's it. The app is running. Open your browser and go to **[http://localhost:3000](http://localhost:3000)**.

To check the logs: `docker logs "Torn War Fetcher"`
To stop it: `docker stop "Torn War Fetcher"`

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
