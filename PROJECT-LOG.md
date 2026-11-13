
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

## Phase 2 - Day 1: Kubernetes Fundamentals and Local Setup

### Goal
Understand Kubernetes and establish a working local cluster without affecting the existing AWS ECS deployment.

### Concepts (in my words)
- **Kubernetes:** A platform that manages containerized applications, including deployment, scaling, and recovery.
- **Cluster:** A collection of Nodes managed by Kubernetes.
- **Node:** A machine that runs Kubernetes workloads.
- **Pod:** The smallest deployable unit in Kubernetes, containing one or more containers.
- **kubectl:** A command-line tool for communicating with Kubernetes.
- **Minikube:** A tool for running a local Kubernetes cluster.
- **Namespace:** A logical grouping of Kubernetes resources.

### What I built
- Installed Minikube v1.39.0.
- Used the existing Docker Desktop environment.
- Started a single-node Kubernetes cluster.
- Verified the Node became Ready.
- Confirmed all eight system Pods were running.

### Commands and reasons

```bash
docker ps
# Verify Docker Engine connectivity.

kubectl version --client
# Verify kubectl installation.

minikube version
# Verify Minikube installation.

minikube start --driver=docker
# Start a local Kubernetes cluster using Docker.

kubectl get nodes
# Check Kubernetes Node status.

kubectl wait --for=condition=Ready node/minikube --timeout=180s
# Wait for the Node to become Ready.

kubectl get pods -n kube-system
# Verify Kubernetes system components.
```

### Result and evidence
- Docker Engine: 29.9.2
- kubectl: 1.36.1
- Minikube: 1.39.0
- Kubernetes: 1.37.0
- Node: Ready
- System Pods: 8 running, zero restarts
- Additional AWS infrastructure: None

### Problems and fixes
The Node initially reported `NotReady` during cluster initialization. Waiting for the Ready condition resolved the issue without requiring a restart.

### What I learned
Kubernetes and ECS both orchestrate containers. Kubernetes uses Pods, Nodes, Deployments, and Services, while ECS uses Tasks, Task Definitions, and Services. Minikube allows me to learn Kubernetes locally without provisioning paid AWS infrastructure.

## Phase 2 - Day 2: Deploying CloudPipeline to Kubernetes

### Goal
Deploy the existing CloudPipeline Node.js application to a local Kubernetes cluster without modifying the AWS ECS pipeline.

### Concepts (in my words)
- **Namespace:** Organizes Kubernetes resources within a cluster.
- **Deployment:** Defines how many application Pods should run and which image they use.
- **ReplicaSet:** Maintains the number of Pods requested by a Deployment.
- **Pod:** Runs our application container inside Kubernetes.
- **Image pull policy:** Controls whether Kubernetes downloads an image or uses one already available locally.

### What I built
- Created `k8s/namespace.yaml` for the `cloudpipeline` namespace.
- Created `k8s/deployment.yaml` with one replica.
- Reused the existing Node.js application and Dockerfile.
- Built the Docker image locally.
- Loaded the image into Minikube.
- Deployed the application and inspected its Pod and logs.

### Commands and code with reasons

```bash
minikube kubectl -- apply -f k8s/namespace.yaml
# Create the application namespace.

docker build -t cloudpipeline-app:local .
# Package the existing application.

minikube image load cloudpipeline-app:local
# Make the image available inside Minikube.

minikube image ls | grep cloudpipeline-app
# Verify the image is available.

minikube kubectl -- apply -f k8s/deployment.yaml
# Create the application Deployment.

minikube kubectl -- get pods -n cloudpipeline
# Check Pod status.

minikube kubectl -- logs deployment/cloudpipeline-app -n cloudpipeline
# Inspect application startup logs.
```

### Result and evidence
- Namespace: Active
- Deployment: Applied successfully
- Pod: `1/1 Running`
- Container restarts: 0
- Application startup message: `CloudPipeline Incident Tracker listening on port 3000`
- HTTP health verification: Pending until Day 3
- Additional AWS resources: None

### Problems and fixes
Minikube initially could not connect to the Kubernetes API server because Docker Desktop was unavailable and the cluster had stopped. Restarting Docker Desktop and running `minikube start --driver=docker` restored the cluster.

The standalone `kubectl` command was unavailable, so I used `minikube kubectl --` instead.

### What I learned
Kubernetes Deployments manage application replicas through ReplicaSets. Pods run the actual containers. Unlike our ECS deployment, which retrieves images from Amazon ECR, our local Kubernetes deployment uses an image loaded directly into Minikube.

### Interview answer
I extended CloudPipeline with a second deployment option using local Kubernetes. I created a dedicated namespace and Deployment, reused the existing Docker image, and loaded it into Minikube. Kubernetes started the Node.js application inside a Pod, and I verified its status and startup logs. This allows me to compare Kubernetes orchestration with AWS ECS without introducing additional AWS infrastructure costs.

## Kubernetes Phase 2 — Day 3: Networking and Health Checks

### Goal
Expose the Node.js application internally using a Kubernetes Service, verify HTTP connectivity, and configure readiness and liveness probes.

### Concepts (in my words)
- **Service:** A stable network endpoint that directs traffic to matching Pods.
- **ClusterIP:** An internal Service address that isn't directly accessible from outside Kubernetes.
- **Selector:** Connects a Service to Pods using matching labels.
- **Port forwarding:** Creates a temporary connection from my computer to an application inside Kubernetes.
- **Readiness probe:** Checks whether a container is ready to receive traffic.
- **Liveness probe:** Detects unhealthy containers and allows Kubernetes to restart them.
- **Rolling update:** Kubernetes gradually replaces old Pods with updated ones.

### What I built
- Created `k8s/service.yaml` with a ClusterIP Service.
- Configured Service port 80 to forward traffic to the application's port 3000.
- Verified that the Service identified the application Pod.
- Accessed `/health` through local port 8080.
- Added HTTP readiness and liveness probes to `k8s/deployment.yaml`.

### Commands and reasons

```bash
minikube kubectl -- apply -f k8s/service.yaml
```
Created the Service.

```bash
minikube kubectl -- get services -n cloudpipeline
minikube kubectl -- get endpoints cloudpipeline-service -n cloudpipeline
```
Verified the Service and its application endpoint.

```bash
minikube kubectl -- port-forward service/cloudpipeline-service 8080:80 -n cloudpipeline
curl -i http://127.0.0.1:8080/health
```
Established local connectivity and tested the application.

```bash
minikube kubectl -- apply --dry-run=client -f k8s/deployment.yaml
minikube kubectl -- apply -f k8s/deployment.yaml
minikube kubectl -- rollout status deployment/cloudpipeline-app -n cloudpipeline --timeout=120s
```
Validated, applied, and verified the updated Deployment.

```bash
minikube kubectl -- describe deployment cloudpipeline-app -n cloudpipeline
```
Confirmed both probes were configured.

### Result and evidence
- Service created successfully with internal IP `10.105.189.214`.
- Service endpoint pointed to the application Pod on port 3000.
- `/health` returned HTTP 200 OK.
- Readiness and liveness probes were confirmed.
- Deployment rolled out successfully.

### Problems and fixes
No configuration failures encountered during this milestone.

### Interview answer
I deployed my Node.js application to local Kubernetes using Minikube. I created a ClusterIP Service that routes traffic to the application Pods using labels and selectors. I verified connectivity using port forwarding and the `/health` endpoint. I also configured readiness and liveness probes to control traffic routing and support automatic container recovery.

### What could go wrong?
If the Service selector doesn't match the Pod labels, the Service won't have matching endpoints and traffic won't reach the application. Incorrect health-check paths or overly aggressive probe settings can also cause availability problems.

## Kubernetes Phase 2 — Day 4: Automated CI with Kind

### Goal
Automatically deploy and test the Node.js application inside a temporary Kubernetes cluster using GitHub Actions.

### Concepts (in my words)
- **Kind:** A tool that runs Kubernetes clusters inside Docker containers.
- **GitHub Actions runner:** A temporary computer that executes our workflow.
- **Workflow trigger:** An event that starts automation, such as a Git push.
- **Smoke test:** A simple test that checks whether the deployed application responds correctly.
- **CI isolation:** Testing Kubernetes separately without modifying the existing ECS deployment pipeline.

### What I built
Created `.github/workflows/kubernetes-ci.yml` with these steps:

1. Checkout repository.
2. Build Docker image.
3. Create a Kind cluster.
4. Load the Docker image into Kind.
5. Apply Kubernetes Namespace, Deployment, and Service manifests.
6. Wait for successful Deployment rollout.
7. Inspect Kubernetes resources.
8. Test `/health` using port forwarding and curl retries.
9. Display diagnostics if the workflow fails.

### Important commands and reasons

- `docker build -t cloudpipeline-app:local .` — Build the application image.
- `kind load docker-image cloudpipeline-app:local --name cloudpipeline-ci` — Load the image into the correct Kind cluster.
- `kubectl apply -f` — Create Kubernetes resources.
- `kubectl rollout status` — Wait for the Deployment to become available.
- `kubectl port-forward` — Access the Service from the runner.
- `curl --fail` — Fail the smoke test when HTTP requests return errors.
- `kubectl describe` and `kubectl logs` — Diagnose Kubernetes failures.

### Result and evidence
- GitHub Actions ran successfully on the `kubernetes-ci-test` branch.
- The workflow completed in approximately 1 minute 13 seconds.
- Docker image build succeeded.
- Kind cluster and application deployment succeeded.
- Kubernetes rollout completed successfully.
- `/health` returned `{"status":"ok"}`.
- The workflow finished successfully without deploying to AWS.

### Problems and fixes

**Problem:** The first workflow failed while loading the Docker image.

**Root cause:** The command searched for a Kind cluster named `kind`, but the cluster had a different name.

**Fix:** Explicitly configured `cluster_name: cloudpipeline-ci` and loaded the image using `--name cloudpipeline-ci`.

**Additional observation:** The first HTTP request failed because port forwarding wasn't ready. The retry mechanism successfully handled the delay.

### Interview answer
I extended my existing CI/CD project by adding a separate Kubernetes testing workflow. GitHub Actions builds the Docker image and creates a temporary Kind cluster. The workflow deploys the application using Kubernetes manifests, waits for readiness, and tests its health endpoint. This validates Kubernetes deployment behavior without requiring AWS infrastructure.

### What could go wrong?
An incorrect cluster name, unavailable container image, failing readiness probe, or unhealthy application could cause the workflow to fail. Kubernetes resource descriptions and container logs help identify the cause.
## Kubernetes Phase 2 — Day 5: Troubleshooting and Recovery

### Goal
Learn to identify, diagnose, and recover from common Kubernetes failures without affecting the working application or AWS ECS infrastructure.

### Concepts (in my words)
- **ErrImagePull:** Kubernetes failed to download a container image.
- **ImagePullBackOff:** Kubernetes delays repeated attempts to download an unavailable image.
- **CrashLoopBackOff:** Kubernetes delays restarting a container that repeatedly terminates.
- **Readiness probe:** Determines whether a running container is ready to receive traffic.
- **Exit code:** Indicates whether a process finished successfully (`0`) or unsuccessfully (typically nonzero).
- **Pod events:** Diagnostic messages that help explain scheduling, image pulling, container restarts, and health-check failures.

### What I Built and Tested
I performed three isolated troubleshooting experiments in my local Minikube cluster.

**1. ImagePullBackOff**

Created a Pod using a nonexistent Docker image with `imagePullPolicy: Always`.

Observed `ErrImagePull`, followed by `ImagePullBackOff`.

Used `kubectl describe` to identify the failed Docker Hub image pull.

**2. Container crash and restart backoff**

Created a BusyBox Pod with a command that prints an error message and exits with code `1`.

Observed repeated restarts and container errors.

Verified the exit code and inspected the application logs.

**3. Readiness probe failure**

Created a Pod using the working CloudPipeline image but configured its readiness probe to check `/wrong-health`.

Observed `0/1 Running`, with zero container restarts.

Used `kubectl describe` to identify repeated HTTP 404 responses.

### Commands and Reasons

```bash
# Check application health
minikube kubectl -- get pods -n cloudpipeline

# Investigate Pod configuration and events
minikube kubectl -- describe pod POD_NAME -n cloudpipeline

# Inspect container output
minikube kubectl -- logs POD_NAME -n cloudpipeline

# Inspect a previous container instance
minikube kubectl -- logs POD_NAME -n cloudpipeline --previous

# Check the previous termination exit code
minikube kubectl -- get pod POD_NAME -n cloudpipeline \
  -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}{"\n"}'

# Remove temporary troubleshooting Pods
minikube kubectl -- delete pod POD_NAME -n cloudpipeline
```

### Results and Evidence
- Image pull failure reproduced and diagnosed through Kubernetes events.
- Repeated container failures reproduced with exit code `1`.
- Readiness probe failure confirmed by HTTP 404 events.
- The original `cloudpipeline-app` remained healthy throughout the experiments.
- All temporary troubleshooting Pods were deleted.

### Problems and Fixes

**Problem:** The first BusyBox test showed exit code `0` rather than `1`.

**Root cause:** The Pod configuration contained no explicit container `command` or `args`, so the image's default startup command was used.

**Fix:** Recreated the Pod with an explicit shell command that exits with code `1`.

**Problem:** Previous container logs were temporarily unavailable.

**Fix:** Used Pod events, container status, and exit codes as alternative diagnostic evidence.

### Interview Answer
I tested three common Kubernetes failure scenarios using Minikube. I investigated unavailable container images, repeatedly crashing containers, and incorrectly configured readiness probes. I used Kubernetes events, logs, and exit codes to identify the underlying causes. All experiments were isolated from the working application and AWS infrastructure.

## Milestone: Change-Based CI and Manual ECS Deployment

### Goal
Separate automatic application and Kubernetes validation from AWS ECS deployment to improve workflow organization, security, and cost control.

### Concepts (in my words)
- **Change-based CI:** GitHub Actions runs relevant tests when specific files change.
- **Manual deployment:** AWS deployment starts only when I explicitly trigger the workflow.
- **Pull request:** A way to review and validate changes before merging them into the main branch.
- **Workflow validation:** Checking GitHub Actions configuration for errors before running it.
- **Fast-forward pull:** Updating my local branch to a newer commit without creating an extra merge commit.

### What I built
1. Updated `ci.yml` to automatically run Node.js tests and build a Docker image for relevant application changes.
2. Updated `kubernetes-ci.yml` to test the application on a temporary Kind cluster.
3. Updated `deploy-test.yml` to support manually triggered ECR and ECS deployment.
4. Restricted manual deployment jobs to the `main` branch.
5. Preserved GitHub OIDC authentication without storing AWS access keys.
6. Added best-effort ECS cleanup after deployment testing.

### Commands and code with reasons

`actionlint .github/workflows/ci.yml .github/workflows/kubernetes-ci.yml .github/workflows/deploy-test.yml`

Validates GitHub Actions configuration and detects common workflow errors.

`git diff --check`

Checks for whitespace errors in modified files.

`grep -nE 'aws-actions|aws ecs|aws ecr|desired-count' .github/workflows/ci.yml`

Checks that known AWS deployment commands are absent from automatic Node.js CI.

`git push origin kubernetes-ci-test`

Publishes the tested workflow changes to the feature branch.

`git switch main`

Switches to the main branch.

`git pull --ff-only origin main`

Synchronizes local main with GitHub without creating an unexpected merge commit.

### Result and evidence
- Pull Request #2 successfully merged into `main`.
- Merge commit: `afe9307`.
- Node.js CI passed on `main`.
- Kubernetes CI passed on `main`.
- No ECS deployment workflow was triggered by the merge.
- Local repository synchronized successfully.
- `git status --short` returned no output.

### Problems and fixes (root cause)
- **Problem:** ShellCheck reported unused `attempt` variables in retry loops.
  **Root cause:** Loop counters were declared but not referenced.
  **Fix:** Added retry-attempt logging.
- **Problem:** Bash reported `!cancelled: event not found`.
  **Root cause:** A GitHub Actions expression was interpreted directly by Bash, where `!` performs history expansion.
  **Fix:** Edited the expression inside the YAML file instead of executing it as a shell command.
- **Problem:** ECS cleanup could be skipped after deployment failures or cancellation.
  **Root cause:** The cleanup condition depended on the workflow's cancellation state.
  **Fix:** Used `always()` to attempt cleanup after failures and cancellation. This remains best-effort if the runner is terminated.

### Security and cost considerations
- The project's IAM user remains disabled.
- GitHub Actions uses OIDC to assume an AWS IAM role.
- Automatic CI does not deploy to AWS.
- Manual ECS deployment may incur Fargate charges.
- ECS cleanup must be independently verified after every live deployment.
- The updated manual ECS workflow has not yet been tested against AWS.

### Interview answer
I separated automatic CI from AWS deployment to improve reliability and cost control. GitHub Actions now runs Node.js and Kubernetes tests when relevant files change. AWS ECS deployment requires a manual trigger on the main branch and uses OIDC for temporary credentials. I validated the workflows, tested them through a feature branch, and merged the changes after successful CI checks.

## Milestone: ECS Deployment Safety Improvements

### Goal
Improve the reliability of the manual ECS deployment workflow without starting AWS resources.

### Concepts (in my words)
- **Deployment verification:** Checking that the intended application version actually runs.
- **Rollback:** Returning to a previous working version when a deployment fails.
- **Cleanup:** Stopping temporary resources after testing to avoid unnecessary charges.

### What I built
- Added verification that the ECS service references the expected task definition.
- Added verification that the running ECS task uses the expected task definition revision.
- Improved the cleanup condition to attempt scaling ECS back to zero when the Fargate-start step succeeds or fails.

### Commands and code with reasons
- `git diff --check`: Detect whitespace errors.
- `actionlint .github/workflows/deploy-test.yml`: Validate GitHub Actions workflow syntax and expressions.
- `git diff`: Review changes before committing.
- `git commit`: Save the verified workflow changes.

### Result and evidence
- Local workflow validation completed successfully.
- The complete manual ECS deployment workflow was successfully verified on November 13, 2026. GitHub Actions authenticated using OIDC, built and pushed the Docker image to ECR, deployed the application to ECS Fargate, and passed the /health smoke test. Cleanup returned the ECS service to zero running tasks.
- GitHub OIDC authentication was independently tested and passed.

### Problems and fixes (root cause)
- **Problem:** ECS could restore an older revision after a failed deployment.
- **Fix:** Added checks comparing the configured service revision and running task revision against the newly registered revision.
- **Problem:** Cleanup could be attempted even when the Fargate-start step was skipped.
- **Fix:** Restricted the cleanup condition to successful or failed start attempts.
- **Remaining limitation:** Runner interruption can prevent cleanup, so manual recovery remains necessary.

### Interview answer
I improved our GitHub Actions deployment workflow by adding checks that verify both the ECS service and running task use the intended task definition revision. This helps detect unsuccessful releases that might otherwise appear healthy after an automatic rollback. I also refined the cleanup condition so the workflow attempts to stop Fargate after deployment testing. These changes were validated locally, and AWS deployment testing is pending account restoration.

## Milestone: Local Monitoring with Prometheus and Grafana

**Date:** November 10, 2026

### Goal
Add application monitoring to CloudPipeline without creating additional AWS resources or charges.

### Concepts (in my words)
- **Metrics:** Numerical measurements that describe how an application behaves.
- **Prometheus:** Collects and stores application measurements by scraping `/metrics`.
- **Grafana:** Visualizes Prometheus measurements using dashboards.
- **PromQL:** Query language used to calculate request rates, response times, and errors.
- **Docker Compose:** Runs multiple connected containers using one YAML configuration.
- **Regression testing:** Verifies that previously working functionality remains intact after changes.

### What I built
- Instrumented the Node.js Express application using `@prometheus-io/client`.
- Added HTTP request counters, response-time histograms, and default process metrics.
- Configured Prometheus to scrape the application every 15 seconds.
- Ran the application, Prometheus, and Grafana locally with Docker Compose.
- Created three Grafana panels:
  1. HTTP Requests per Second
  2. Average HTTP Response Time
  3. HTTP Server Errors per Second
- Exported the Grafana dashboard to `monitoring/grafana/dashboards/cloudpipeline-dashboard.json`.
- Disabled `/metrics` by default and enabled it explicitly in the local monitoring environment.
- Added two automated tests covering enabled and disabled metrics behavior.

### Commands and code with reasons

`npm test` — Verify the application and metrics security tests.

`npm audit --audit-level=high` — Check dependencies for known vulnerabilities.

`docker compose -f compose.monitoring.yml up -d --build` — Build and run the monitoring services locally.

`docker compose -f compose.monitoring.yml ps` — Check container status.

`curl http://localhost:3000/health` — Verify application availability.

`curl http://localhost:3000/metrics` — Verify metrics are exposed in the local monitoring environment.

`git diff --check` — Check tracked changes for whitespace errors.

### Result and evidence
- All six Node.js tests passed.
- npm audit reported zero known vulnerabilities.
- Prometheus target `cloudpipeline-app` showed UP.
- Grafana successfully queried the Prometheus API.
- The request-rate panel displayed HTTP traffic spikes.
- The response-time panel displayed measurements around 0.4–0.5 milliseconds during testing.
- The server-error panel displayed zero when no matching server-error

## Milestone: End-to-End AWS ECS Deployment Verification

**Date:** November 13, 2026

### Goal
Verify the complete GitHub Actions deployment workflow using AWS ECS Fargate, OIDC authentication, application health checks, and automatic cleanup.

### Concepts (in my words)
- **Authentication:** Verifies the identity accessing AWS.
- **Authorization:** Determines which AWS actions that identity can perform.
- **OIDC:** Allows GitHub Actions to obtain temporary AWS credentials without storing access keys.
- **Smoke test:** Checks that a deployed application responds correctly.
- **Desired count:** Defines how many application tasks an ECS service should maintain.

### What I built
- Configured a dedicated IAM operator with MFA and browser-based AWS CLI authentication.
- Used temporary AWS CLI credentials instead of permanent access keys.
- Applied narrowly scoped permissions for ECS service inspection.
- Verified that GitHub Actions can assume the deployment role through OIDC.
- Successfully executed the manual ECS deployment workflow.
- Verified that the application passed its `/health` smoke test.
- Confirmed that the ECS service returned to zero tasks after deployment.

### Commands and code with reasons

`aws login --profile cloudpipeline-operator --region eu-central-1` — Authenticate using temporary credentials.

`aws sts get-caller-identity --profile cloudpipeline-operator` — Verify the active AWS identity.

`aws ecs describe-services` — Inspect the ECS service and verify task counts.

`aws ecs list-tasks` — Check for remaining running ECS tasks.

`deploy-test.yml` — Automate image publishing, ECS deployment, health verification, and cleanup.

### Result and evidence
- GitHub OIDC authentication workflow: Passed.
- Manual ECS deployment workflow: Passed.
- ECS service: ACTIVE.
- Desired tasks: 0.
- Running tasks: 0.
- Pending tasks: 0.
- Remaining running ECS tasks: None.

### Problems and fixes (root cause)
- **IAM authorization failure:** The new operator lacked permission to inspect the ECS service. Attached a custom policy granting `ecs:DescribeServices` for the specific CloudPipeline service.
- **Deployment cost risk:** Running Fargate tasks can incur charges. Used a manual deployment workflow with automatic cleanup and independent task-count verification.

### Interview answer

I built and verified a GitHub Actions deployment pipeline for a containerized Node.js application running on AWS ECS Fargate. GitHub Actions authenticates through OIDC, builds and publishes the Docker image to ECR, and updates the ECS service. The workflow waits for deployment stability and verifies the `/health` endpoint. After testing, it scales the service to zero tasks to reduce AWS costs.

### Likely interview questions

**Why OIDC instead of AWS access keys?**
OIDC provides temporary AWS credentials and avoids storing permanent secrets in GitHub.

**Why use a manual deployment trigger?**
It allows controlled deployment testing without starting chargeable infrastructure on every push.

**How did you verify cleanup?**
I checked the ECS desired, running, and pending task counts and confirmed the running task list was empty.

### What could go wrong?
If a GitHub Actions runner is interrupted, automated cleanup might not complete. I would inspect the ECS service and manually scale it to zero if necessary.

## Milestone: Prometheus Monitoring Alerts

**Date:** November 13, 2026

### Goal

Extend CloudPipeline monitoring with automated detection of application downtime and high HTTP 5xx error rates, using local Docker containers without additional AWS infrastructure.

### Concepts (in my words)

- **Alert rule:** A PromQL condition evaluated automatically by Prometheus.
- **Pending:** The alert condition is true, but the configured waiting period has not elapsed.
- **Firing:** The alert condition has remained true long enough to activate the alert.
- **Recovery:** The alert returns to inactive when the condition is no longer true.
- **Synthetic testing:** Using simulated metrics to verify monitoring behavior without deliberately breaking the application.

### What I built

- Created `CloudPipelineAppDown` to detect failed Prometheus scrapes lasting at least one minute.
- Created `CloudPipelineHigh5xxErrorRate` to detect HTTP 5xx error rates exceeding 0.05 errors per second for one minute.
- Configured Prometheus to evaluate alerts every 15 seconds.
- Tested downtime detection by stopping and restarting the local application container.
- Created a synthetic Prometheus test that verifies both activation and recovery of the 5xx alert.
- Updated GitHub Actions CI to validate Prometheus configuration and execute alert behavior tests.

### Commands and code with reasons

`docker compose -f compose.monitoring.yml stop app` — Simulate application downtime.

`docker compose -f compose.monitoring.yml start app` — Restore the application and verify alert recovery.

`up{job="cloudpipeline-app"}` — Check whether Prometheus can scrape the application.

`promtool check config` — Validate Prometheus configuration and referenced alert rules.

`promtool test rules` — Verify alert behavior against synthetic HTTP error metrics.

`git diff --check` — Check changes for whitespace errors.

`gitleaks detect --source . --no-git --redact` — Scan project files for potential exposed secrets.

### Result and evidence

- Downtime alert transitioned from INACTIVE to FIRING after sustained application downtime.
- Downtime alert returned to INACTIVE after the application restarted.
- HTTP 5xx alert successfully fired in a synthetic test.
- HTTP 5xx alert recovery scenario was added to the synthetic test.
- Prometheus configuration and rule syntax were validated.
- Both alerts appeared in the Prometheus interface.

### Problems and fixes (root cause)

- **Docker Compose YAML error:** Duplicate `volumes` keys prevented configuration parsing. Consolidated the mounts into one block.
- **Prometheus restart failure:** Docker Desktop could not reuse an existing WSL bind mount. Recreated the Prometheus container using Docker Compose without deleting its persistent data volume.
- **CI not triggered by monitoring changes:** GitHub Actions path filters excluded monitoring configuration files. Extended the filters and added automated Prometheus validation.

### Interview answer

I extended CloudPipeline with Prometheus alerts for application downtime and HTTP server errors. I configured alert rules that evaluate metrics every 15 seconds and use a one-minute waiting period to reduce false alarms. I tested downtime detection using a controlled container stop and tested HTTP error conditions using synthetic metrics. I also integrated Prometheus configuration validation and alert behavior testing into GitHub Actions.

### Likely interview questions

**Why use a waiting period before firing an alert?**

It prevents brief failures from triggering unnecessary alerts.

**What's the difference between the two alerts?**

The downtime alert detects failed Prometheus scrapes, while the 5xx alert detects frequent server errors even when the application is reachable.

**Why use synthetic metrics?**

They let me test alert conditions and recovery without deliberately breaking application code.

### What could go wrong?

An alert threshold might be too sensitive and generate unnecessary warnings, or too high and fail to detect meaningful problems. Thresholds should be adjusted based on observed application behavior.

## Milestone: Container Security Hardening with Trivy

**Date:** November 13, 2026

### Goal

Improve CloudPipeline container security by scanning Docker images for vulnerabilities, minimizing unnecessary runtime software, and adding automated security scanning to CI.

### Concepts (in my words)

- **Vulnerability:** A known security weakness in software that attackers might exploit.
- **Trivy:** A tool that scans container images for known vulnerabilities.
- **Multi-stage Docker build:** A Dockerfile that separates dependency installation from the final runtime environment.
- **Distroless image:** A minimal container image containing only essential runtime components.
- **Attack surface:** The software and interfaces that could potentially be exploited.
- **Security gate:** An automated check that can prevent a CI pipeline from succeeding when security requirements are not met.

### What I built

1. Scanned the original CloudPipeline Docker image using Trivy.
2. Identified six HIGH vulnerabilities in npm's bundled `undici` and `brace-expansion` packages.
3. Rebuilt the original image with updated base-image layers, but the vulnerabilities remained.
4. Replaced the Dockerfile with a multi-stage build and distroless Node.js runtime.
5. Configured the application to run directly with Node.js instead of npm.
6. Confirmed that the new image runs as non-root user ID `65532`.
7. Repeated the vulnerability scan and reduced detected HIGH vulnerabilities from six to zero.
8. Updated the ECS task-definition health check from `CMD-SHELL` to `CMD`.
9. Updated the GitHub Actions deployment workflow to preserve compatibility with the new runtime.
10. Added Trivy scanning to the main CI workflow, failing CI on detected fixable HIGH or CRITICAL vulnerabilities.
11. Verified that CloudPipeline CI and Kubernetes CI both passed.

### Commands and code with reasons

**Build the Docker image:**

```bash
docker build --pull -t cloudpipeline-app:security-scan .
```

Builds the current Dockerfile and checks for an updated base image.

**Run the Trivy vulnerability scan:**

```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v trivy_cache:/root/.cache/ \
  aquasec/trivy:0.76.2 image \
  --image-src docker \
  --scanners vuln \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  cloudpipeline-app:security-scan
```

Scans the locally built container image for HIGH and CRITICAL vulnerabilities that have available fixes.

**Test the application health endpoint:**

```bash
curl -i http://127.0.0.1:3000/health
```

Confirms that the hardened container responds successfully.

**Check the container user:**

```bash
docker inspect cloudpipeline-security-test \
  --format '{{.Config.User}}'
```

Confirms that the container runs as a non-root user.

**Validate Terraform:**

```bash
terraform fmt task.tf
terraform validate
```

Formats and validates the ECS task-definition configuration.

### Result and evidence

- Original image: **6 HIGH, 0 CRITICAL** vulnerabilities.
- Hardened image: **0 HIGH, 0 CRITICAL** vulnerabilities under the selected scan policy.
- Application health endpoint: **HTTP 200 OK**.
- Container user: **65532 (non-root)**.
- Terraform validation: **Success**.
- ECS health-check command: Successfully tested locally with exit code `0`.
- GitHub Actions CloudPipeline CI #30: **Passed**.
- GitHub Actions Kubernetes CI #10: **Passed**.

### Problems and fixes (root cause)

**Problem:** Six vulnerabilities remained after updating the original Node.js base image.

**Root cause:** The base image contained vulnerable npm dependencies even though the application itself did not require npm at runtime.

**Fix:** Introduced a multi-stage Docker build with a distroless final image.

**Problem:** Existing ECS health check depended on a shell.

**Root cause:** Distroless images do not include a shell.

**Fix:** Replaced `CMD-SHELL` with `CMD` and executed `/nodejs/bin/node` directly. Verified the command locally and updated the deployment workflow.

**Problem:** A Python command used to summarize Trivy results produced a syntax error.

**Root cause:** Incorrect quotation escaping inside a Python f-string.

**Fix:** Simplified the Python output statements and reran the scan successfully.

### Interview answer

I improved CloudPipeline's container security by integrating Trivy vulnerability scanning into GitHub Actions. The initial scan identified six HIGH vulnerabilities in npm packages bundled with the Node.js base image. I introduced a multi-stage Docker build with a distroless runtime, reducing the reported HIGH vulnerabilities to zero while retaining non-root execution. I also updated the ECS health check for distroless compatibility and verified the changes through local testing, Terraform validation, and successful GitHub Actions runs.

### Likely interview questions

**1. Why use a multi-stage Docker build?**

To separate dependency installation from runtime execution and reduce unnecessary software in the final image.

**2. Why didn't npm audit detect the six vulnerabilities?**

The vulnerable packages were bundled with npm in the Docker base image rather than installed as application dependencies.

**3. Why did you change CMD-SHELL to CMD?**

Because distroless containers don't include a shell, so the health check must execute Node.js directly.

### What could go wrong?

A future base-image or dependency update could introduce new vulnerabilities. Automated Trivy scanning helps detect those findings, but regular review and patching are still necessary.

## Milestone: Final Hardened ECS Deployment Verification

**Date:** November 13, 2026

### Goal

Verify that the hardened, distroless CloudPipeline Docker image deploys successfully to AWS ECS Fargate and that the service returns to zero running tasks afterward.

### Concepts (in my words)

- **Deployment verification:** Confirming that an application works in its actual deployment environment.
- **Smoke test:** A quick test checking that the deployed application's essential functionality works.
- **ECS desired count:** The number of tasks ECS is configured to maintain.

### What I built

- Executed the manual GitHub Actions deployment workflow.
- Authenticated to AWS using GitHub OIDC.
- Built and pushed the hardened Docker image to Amazon ECR.
- Registered a new ECS task-definition revision using the distroless-compatible health check.
- Deployed the application to ECS Fargate.
- Successfully completed the automated `/health` smoke test.
- Confirmed that the ECS service returned to zero tasks.

### Commands and code with reasons

```bash
aws ecs describe-services \
  --cluster pipewright-cluster \
  --services pipewright-app \
  --region eu-central-1 \
  --profile cloudpipeline-operator \
  --query 'services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount,TaskDefinition:taskDefinition}' \
  --output table
```

This read-only command independently verifies the ECS service status and task counts after deployment.

### Result and evidence

- GitHub Actions manual ECS deployment: **Passed**.
- Application smoke test: **Passed**.
- ECS task definition: **pipewright-app:22**.
- Service status: **ACTIVE**.
- Desired tasks: **0**.
- Running tasks: **0**.
- Pending tasks: **0**.
- Previously verified image scan: **0 HIGH and 0 CRITICAL fixable vulnerabilities**.

### Problems and fixes (root cause)

**Problem:** The local AWS operator user received `AccessDeniedException` when calling `ecs:ListTasks`.

**Root cause:** Its IAM policy did not permit `ecs:ListTasks`.

**Resolution:** Used the already-authorized `ecs:DescribeServices` operation to independently verify that the service had zero running, pending, and desired tasks, without expanding IAM permissions.

### Interview answer

I hardened the CloudPipeline Docker image using a multi-stage build and distroless Node.js runtime. I integrated Trivy scanning into GitHub Actions and reduced the reported HIGH vulnerabilities from six to zero. I updated the ECS health check to run without a shell and verified the image through the complete GitHub Actions deployment workflow. Finally, I confirmed the application passed its smoke test and the ECS service returned to zero running tasks.

### Likely interview questions

**Why use distroless?** To reduce unnecessary software and the container's attack surface.

**How did you verify deployment success?** Through GitHub Actions deployment status, the `/health` smoke test, and ECS service status.

**How did you control Fargate costs?** By using a manual deployment workflow that scales the ECS service back to zero after testing.

### What could go wrong?

A successful deployment doesn't guarantee cleanup will always succeed. The workflow includes automatic cleanup, but task counts should also be checked independently.

