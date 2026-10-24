
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

## Milestone: Automatic ECS Rollback Verified

### Goal

Demonstrate that AWS ECS detects a failed application deployment, triggers its deployment circuit breaker, and rolls back to a previously successful service revision.

### Concepts (in my words)

- **Task definition revision:** A numbered version of the container configuration that ECS can use when launching tasks.
- **Container health check:** A command ECS runs to determine whether an application container is functioning correctly.
- **Rolling deployment:** A deployment strategy that can temporarily run both old and new application tasks.
- **Deployment circuit breaker:** An ECS mechanism that declares a deployment failed when its configured failure threshold is reached.
- **Automatic rollback:** ECS restoring a previously successful deployment after a failed deployment.

### What I Built and Tested

1. Fixed the GitHub Actions CD workflow to retrieve the task definition selected by the ECS service rather than the latest registered revision.
2. Confirmed both GitHub Actions jobs passed.
3. Verified that task definition revision 12 contained the correct `/health` check.
4. Started revision 12 and confirmed its ECS deployment was `COMPLETED` and its container health was `HEALTHY`.
5. Registered revision 13 with an intentionally failing health check: `["CMD-SHELL", "exit 1"]`.
6. Deployed revision 13 and observed three tasks fail container health checks.
7. Retrieved the ECS deployment-history record and confirmed that the circuit breaker triggered and a rollback completed.
8. Returned the ECS service to revision 12 with desired, running, and pending counts all at zero.

### Commands and Code With Reasons

**Inspect the current ECS service:**

```bash
aws ecs describe-services \
  --cluster pipewright-cluster \
  --services pipewright-app \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Check the selected task definition, deployment states, task counts, and recent service events.

**Inspect an individual task:**

```bash
aws ecs describe-tasks \
  --cluster pipewright-cluster \
  --tasks TASK_ID \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Identify an unhealthy container and its recorded failure reason.

**Retrieve deployment history:**

```bash
aws ecs list-service-deployments \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Obtain the actual service deployment ARN and historical status.

**Inspect the rollback evidence:**

```bash
aws ecs describe-service-deployments \
  --service-deployment-arns arn:aws:ecs:eu-central-1:349326897252:service-deployment/pipewright-cluster/pipewright-app/UkWSR_SFT2u2VoODG1R3Z \
  --region eu-central-1 \
  --profile cloudpipeline
```

Reason: Verify the circuit-breaker result using AWS's deployment record.

### Result and Evidence

On October 23, 2026, AWS returned:

```json
{
  "status": "ROLLBACK_SUCCESSFUL",
  "statusReason": "Service deployment rolled back because the circuit breaker threshold was exceeded.",
  "deploymentCircuitBreaker": {
    "status": "TRIGGERED",
    "failureCount": 3,
    "threshold": 3
  }
}
```

The rollback record identified service revision `8564835179907107478` as the recovery target. This was the previously successful deployment associated with healthy task definition revision 12.

**Important qualification:** During troubleshooting, I also manually scaled the service to zero and later reselected revision 12. The AWS record confirms the circuit breaker triggered and ECS completed a rollback; the final service state was also affected by manual actions.

Final verified state:

- Task definition: `pipewright-app:12`
- Desired tasks: 0
- Running tasks: 0
- Pending tasks: 0

### Problems and Fixes (Root Cause)

**Problem 1: A broken health check propagated into revision 11.**

Root cause: GitHub Actions copied the latest registered ECS task definition and changed only its Docker image. Because the source revision was broken, the new revision inherited `exit 1`.

Fix: Updated the workflow to retrieve the task definition selected by the ECS service. Verified that the next pipeline run registered healthy revision 12.

**Problem 2: The deployment remained IN_PROGRESS after unhealthy tasks were stopped.**

Observation: ECS stopped failed tasks and launched replacements before completing failure evaluation. Repeatedly checking service status did not establish whether the circuit breaker had triggered.

Fix: Used ECS deployment history as the authoritative record and confirmed `failureCount: 3`, `threshold: 3`, and `ROLLBACK_SUCCESSFUL`.

**Problem 3: Invalid service deployment ARN.**

Root cause: An `ecs-svc/...` deployment ID was incorrectly treated as a service deployment ARN.

Fix: Retrieved actual ARNs using `aws ecs list-service-deployments`.

**Problem 4: AccessDenied when reading deployment history.**

Root cause: The `cloudpipeline-user` IAM identity lacked `ecs:ListServiceDeployments` and related read permissions. It also could not run `iam:ListUserPolicies`.

Fix: Used the AWS Console to add a narrowly scoped inline policy, `PipewrightECSDeploymentReadOnly`, granting deployment-history read access without IAM administration privileges.

**Problem 5: Terraform provider did not expose newer circuit-breaker options.**

Observation: The installed AWS provider exposed `enable` and `rollback` inside the `deployment_circuit_breaker` block, while the ECS API returned additional configuration fields.

Resolution: Kept Terraform's supported configuration unchanged and verified the actual AWS deployment behavior instead of adding unsupported arguments.

### Interview Answer

I created an intentionally unhealthy ECS task definition to test how the deployment circuit breaker handles failed releases. ECS detected three container health-check failures and stopped the affected tasks. I verified that the circuit breaker was triggered and the

## Milestone: Fully Automated CI/CD Deployment and Health Verification

### Goal

Complete an automated CI/CD pipeline that tests, builds, publishes, deploys, and verifies the Node.js application on AWS ECS Fargate after successful pushes to `main`.

### Concepts (in my words)

- **Job dependency:** GitHub Actions uses `needs` to ensure a job starts only after its required job succeeds.
- **Continuous deployment:** Automatically releasing application changes after successful validation.
- **Smoke test:** A quick HTTP request that verifies the deployed application is responding correctly.
- **Best-effort cleanup:** An automated attempt to stop temporary resources after testing, including when an earlier step fails.

### What I Built

Extended `.github/workflows/ci.yml` with a third job, `deployment-test`.

The automated pipeline now follows this sequence:

1. `test-and-build`: Install dependencies, run Node.js tests, and build the Docker image.
2. `check-aws-auth`: Authenticate to AWS using OIDC, push the image to ECR, register a new task definition revision, and update the ECS service.
3. `deployment-test`: Verify the deployed image matches the current Git commit, start Fargate, wait for ECS stability, test `/health`, and stop Fargate afterward.

The existing manually triggered `deploy-test.yml` remains available for controlled testing.

### Commands and Code With Reasons

**Job dependency:**

```yaml
deployment-test:
  needs: check-aws-auth
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

Reason: Run live deployment testing only after successful publishing on `main`.

**Verify the application image:**

```bash
case "$IMAGE" in
  *":$GITHUB_SHA") echo "Correct commit image confirmed." ;;
  *) echo "ERROR: ECS image does not match this commit."; exit 1 ;;
esac
```

Reason: Ensure the live test uses the image associated with the current pipeline run.

**Verify application health:**

```bash
curl --fail "http://$PUBLIC_IP:3000/health"
```

The workflow additionally checks that the JSON response contains `"status": "ok"`.

Reason: Verify that the actual running application responds successfully.

**Scale down and verify cleanup:**

```bash
aws ecs update-service \
  --cluster pipewright-cluster \
  --service pipewright-app \
  --desired-count 0
```

The cleanup job checks the desired, running, and pending task counts until they reach zero.

Reason: Reduce AWS costs and avoid leaving unnecessary Fargate tasks running after tests.

### Result and Evidence

- GitHub Actions `deployment-test` job completed successfully in 2 minutes and 32 seconds.
- OIDC authentication succeeded.
- The service image was verified against the Git commit.
- ECS successfully started and stabilized the Fargate application.
- The `/health` smoke test passed.
- The automatic cleanup step completed.
- An independent AWS CLI check confirmed Desired 0, Running 0, and Pending 0.

This demonstrates successful automatic live deployment verification following a push to `main`.

### Problems and Fixes (Root Cause)

**Problem: The original pipeline published images but did not run a live deployment test automatically.**

Root cause: The automatic workflow set ECS desired count to zero, while the live deployment-test workflow required manual triggering.

Fix: Added `deployment-test` as a third dependent job in `ci.yml`.

**Problem: Cleanup could remain waiting for ECS service stability even after tasks stopped.**

Root cause: The ECS `services-stable` waiter checks service deployment stability, not only task shutdown.

Fix: Replaced the cleanup waiter with repeated checks of desired, running, and pending task counts.

**Problem: New deployments must be matched to the correct commit.**

Risk: The service might reference an unexpected image revision.

Fix: Added an image-tag verification step using `GITHUB_SHA` before starting Fargate.

### Limitations and Future Improvements

- Fargate and public IPv4 usage incur charges during each live deployment test.
- Cleanup is best-effort and cannot guarantee recovery from runner termination or AWS outages.
- The workflow validates healthy deployments, but rollback behavior was demonstrated separately through the ECS deployment circuit-breaker experiment.
- A production deployment would require stronger network isolation, monitoring, and recovery controls.

### Interview Answer

I built a three-job GitHub Actions pipeline that tests a Node.js application, builds its Docker image, and publishes it to Amazon ECR using temporary AWS credentials obtained through OIDC. After publishing, the pipeline registers a new ECS task definition revision and starts a Fargate task. It verifies the running application using an HTTP `/health` smoke test and automatically scales the service back to zero to control costs. I also tested ECS's deployment circuit breaker separately and verified a recorded successful rollback after three health-check failures.

### Three Likely Interview Questions

**Q: How do you prevent deployment before tests succeed?**

A: GitHub Actions uses `needs` so downstream jobs only run after their dependencies succeed.

**Q: How do you verify the correct image is deployed?**

A: The workflow compares the ECS task definition's Docker image tag against the current Git commit SHA.

**Q: How do you prevent unnecessary Fargate charges?**

A: The workflow scales the ECS service to zero after testing and checks that all running and pending tasks have stopped.

### What Could Go Wrong?

If a GitHub runner stops unexpectedly or loses AWS access, cleanup might not execute. The remaining ECS tasks would require monitoring and manual intervention to prevent unnecessary costs.
