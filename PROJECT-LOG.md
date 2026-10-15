
## Milestone: Run CloudPipeline in Docker

### Goal
Package the incident tracker so it can run consistently locally and on AWS.

### Concepts
- Dockerfile: instructions for building the app image.
- Image: the packaged app, dependencies, and runtime.
- Container: a running instance of an image.
- Port mapping: connects a computer's port to a container's port.
- Build context: files Docker can access during a build.

### What I built
- Dockerfile using Node.js 24 on Debian Bookworm Slim.
- Dependencies installed using npm ci --omit=dev.
- App runs as the non-root node user.
- .dockerignore excludes dependencies, Git data, and sensitive files.

### Commands and code with reasons
- docker build -t cloudpipeline-app:local .
  Builds the image from the current folder.
- docker run -d --name cloudpipeline-local -p 3000:3000 cloudpipeline-app:local
  Starts the app in the background and exposes it locally.
- curl -i http://localhost:3000/health
  Checks whether the containerized app responds.
- docker stop cloudpipeline-local
  Stops the test container.
- docker rm cloudpipeline-local
  Removes the test container while keeping the image.

### Result and evidence
The image built successfully. The containerized /health endpoint
returned HTTP 200 with {"status":"ok"}.

### Problems and fixes
Dockerfile instructions initially ran in Bash and produced
"command not found". The instructions belong inside Dockerfile.
Created that file using a heredoc, then ran docker build.

### Interview answer
I packaged my Node.js incident tracker using Docker.
The Dockerfile installs dependencies from the lockfile and runs
the app as a non-root user. I mapped local port 3000 to the
container and verified /health returned HTTP 200.
This prepares the app for automated image builds and deployment.
