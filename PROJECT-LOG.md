
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

## Milestone: ECS Health-Check Failure and Rollback Experiment

### Goal
Verify that AWS ECS detects an unhealthy application deployment and investigate whether its deployment circuit breaker automatically rolls back to the previous healthy revision.

### Concepts (in my words)
- **Container health check:** ECS periodically runs a command to determine whether a container is functioning correctly.
- **Rolling deployment:** ECS can start a new application version while keeping the previous version running to reduce downtime.
- **Circuit breaker:** A mechanism that stops an ECS deployment after enough task failures.
- **Automatic rollback:** Returning to a previously successful deployment after a new deployment fails.

### What I Built and Tested
1. Confirmed task definition revision 9 was healthy and running.
2. Created a temporary task definition JSON based on revision 9.
3. Replaced the container health-check command with `["CMD-SHELL", "exit 1"]` to simulate a broken application.
4. Registered the configuration as task definition revision 10.
5. Updated the ECS service to deploy revision 10 with a desired task count of 1.
6. Inspected ECS deployments, service events, and container health.
7. Confirmed ECS detected the health-check failure and stopped the unhealthy task.
8. Scaled the service down to zero to control costs.
9. Restored the service's selected task definition to healthy revision 9.

### Commands and Code With Reasons

**Register the broken task definition:**

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition-broken.json \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Create a deliberately unhealthy version without modifying the working revision.

**Deploy the broken revision:**

```bash
aws ecs update-service \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --task-definition pipewright-app:10 \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Test ECS failure detection with the deployment circuit breaker enabled.

**Inspect ECS service events:**

```bash
aws ecs describe-services \
  --cluster pipewright-cluster \
  --services pipewright-app \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Observe deployment progress and identify task health-check failures.

**Stop Fargate tasks:**

```bash
aws ecs update-service \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --desired-count 0 \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Prevent unnecessary Fargate compute charges after testing.

**Restore the healthy task definition:**

```bash
aws ecs update-service \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --task-definition pipewright-app:9 \
  --desired-count 0 \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Ensure the service does not use the intentionally broken configuration in a future deployment.

### Result and Evidence

**Confirmed successful:**
- Revision 9 was healthy before testing.
- Revision 10 started deploying.
- ECS reported: `(task a73de9ea82fa47c0a0f8eaf91152ba11) failed container health checks.`
- ECS stopped the unhealthy task.
- Final service state: Desired 0, Running 0, Pending 0.
- Service task definition restored to revision 9.

**Not yet confirmed:**
- The deployment circuit breaker did not report a failed rollout before the experiment was stopped.
- Automatic rollback to revision 9 was therefore not demonstrated.

### Problems and Fixes

**Problem 1: Task health initially showed UNKNOWN.**

Cause: ECS had not yet reported a definitive health-check result.

Resolution: Inspected subsequent service events, which confirmed the container failed health checks.

**Problem 2: Invalid service deployment ARN.**

Cause: An `ecs-svc/...` deployment identifier was incorrectly used as a service deployment ARN.

Resolution: Identified the mismatch. No infrastructure configuration change was necessary.

**Problem 3: AccessDenied for ecs:ListServiceDeployments.**

Cause: The CLI user's IAM policy did not authorize this optional diagnostic operation.

Resolution: Avoided unnecessary IAM permission changes and used the existing `ecs:DescribeServices` permission.

**Problem 4: Automatic rollback remained unverified.**

Cause: The experiment was stopped before ECS reported that the deployment had failed and rolled back.

Next action: Repeat the rollback experiment with controlled monitoring, sufficient time to reach the failure threshold, and a defined cost limit.

### Interview Answer

I tested failure detection in AWS ECS by creating a task definition with an intentionally failing container health check. I deployed it through the ECS service while retaining the previously healthy revision. ECS detected the health-check failure and stopped the unhealthy task, demonstrating that the health monitoring was working. I stopped the experiment before automatic rollback was confirmed, scaled the service to zero to manage costs, and restored the healthy task definition.

### What Could Go Wrong?

A deployment can repeatedly launch failing replacement tasks, increasing costs while never reaching a healthy state. Deployment events and failure thresholds must be monitored, and the service should be returned to a safe configuration when testing ends.
