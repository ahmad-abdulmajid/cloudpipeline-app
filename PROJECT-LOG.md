
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
## Milestone 8 — First Successful ECS Fargate Deployment

### Goal
Deploy the Node.js application from Amazon ECR to ECS Fargate, verify the `/health` endpoint, and shut down compute resources after testing.

### Concepts (in my words)
- **Task definition:** Instructions telling ECS how to run my Docker container.
- **Task definition revision:** A new version of those instructions, allowing different application versions.
- **ECS service:** Manages the number of tasks that should be running.
- **Security group:** Controls which network connections are permitted.
- **Health check:** Verifies that the application responds correctly.
- **Public IP:** Allows me to access the running application from the internet.

### What I built
- Registered `pipewright-app:2` using the real Docker image from ECR.
- Updated the existing ECS service to use revision 2.
- Started one Fargate task.
- Verified the ECS deployment completed.
- Successfully accessed the `/health` endpoint over the internet.
- Scaled the ECS service back to zero tasks.

### Commands and code with reasons

**Register a task definition:** Used `aws ecs register-task-definition` with the prepared JSON configuration to create revision 2.

**Update the service:**
```bash
aws ecs update-service \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --task-definition pipewright-app:2 \
  --desired-count 0 \
  --region eu-central-1 \
  --profile cloudpipeline
```
Selected the new task definition without starting compute.

**Start one task:** Used `aws ecs update-service --desired-count 1` to run the application temporarily.

**Verify application availability:**
```bash
curl -i --max-time 10 http://3.71.199.104:3000/health
```
Confirmed that the application responded successfully.

**Stop the application:** Used `aws ecs update-service --desired-count 0` to stop Fargate compute.

**Verify cleanup:** Used `aws ecs describe-services` and confirmed desired, running, and pending counts were all zero.

### Result and evidence
- Task definition revision: `pipewright-app:2`
- ECS deployment: `COMPLETED`
- HTTP response: `200 OK`
- JSON response: `{"status":"ok"}`
- Final ECS service counts: Desired 0, Running 0, Pending 0
- Public IPv4 address during test: `3.71.199.104` (temporary)

### Problems and fixes (root cause)
1. **Missing IAM permissions:** The CLI user could not initially list or inspect some ECS and ECR resources. Added narrowly scoped permissions to the existing IAM policies.
2. **Missing jq:** Ubuntu did not have the JSON-processing utility installed. Installed jq and regenerated the task definition JSON.
3. **Bootstrap image:** Terraform's original task definition referenced a placeholder image. Registered revision 2 using the actual ECR image tagged with its Git commit SHA.

### Interview answer
I deployed a containerized Node.js application to AWS ECS Fargate. I registered a new ECS task definition referencing the Docker image produced by GitHub Actions and stored in ECR. I updated the ECS service, started one task, and verified the application returned HTTP 200 from its public health endpoint. Finally, I scaled the service back to zero to control costs.

**What could go wrong?** A task might fail because of incorrect networking, insufficient IAM permissions, a missing image, or an unhealthy application.
