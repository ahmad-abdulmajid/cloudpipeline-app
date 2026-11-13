# CloudPipeline — Technical Glossary

Simple definitions of the concepts used in this project.

## CI/CD and GitHub Actions

- **CI (Continuous Integration):** Automatically testing and validating code changes when developers push code or open pull requests.
- **CD (Continuous Delivery):** Automatically preparing tested application changes so they are ready for deployment.
- **Continuous Deployment:** Automatically releasing validated changes to a running environment without manual approval.
- **Pipeline:** A sequence of automated operations that takes code through testing, building, and delivery.
- **Workflow:** A GitHub Actions automation defined in a YAML file.
- **Trigger:** An event, such as a push or pull request, that starts a workflow.
- **Job:** A group of workflow steps executed on a runner.
- **Step:** An individual operation inside a job.
- **Runner:** A machine that executes GitHub Actions jobs.
- **Artifact:** A file or output produced during a pipeline, such as a compiled application or test report.
- **Git:** A version-control system that tracks changes to project files.
- **Commit:** A saved snapshot of changes in a Git repository.
- **Branch:** A separate line of development within a Git repository.
- **Pull Request:** A proposal to merge changes from one branch into another.
- **Concurrency:** A GitHub Actions feature that controls whether overlapping workflow runs can execute simultaneously.
- **YAML:** A human-readable format used to configure GitHub Actions workflows.

## Node.js and Docker

- **Node.js:** A JavaScript runtime used to execute our application outside a browser.
- **Express:** A Node.js framework used to create HTTP routes and handle requests.
- **Endpoint:** A URL path that an application exposes to receive requests, such as `/health`.
- **HTTP:** A protocol used for communication between clients and web servers.
- **HTTP 200:** A response status indicating that an HTTP request succeeded.
- **Smoke Test:** A quick test that checks whether the most important application functionality is working.
- **Docker:** A platform used to package applications and their dependencies into container images.
- **Dockerfile:** A file containing instructions for building a Docker image.
- **Docker Image:** A packaged application and its runtime dependencies used to create containers.
- **Container:** A running instance of a container image.
- **Image Tag:** A label identifying a particular Docker image version.
- **Git Commit SHA:** A unique identifier for a Git commit that we use to tag Docker images.
- **Immutable Image Tag:** An image tag that cannot be overwritten with different image content.

## AWS Infrastructure

- **AWS:** Amazon Web Services, the cloud platform hosting our deployment infrastructure.
- **Amazon ECR:** AWS's container image registry, where CloudPipeline stores Docker images.
- **ECR Lifecycle Policy:** Rules that automatically expire older container images to control storage usage.
- **Amazon ECS:** An AWS service that manages and runs containerized applications.
- **AWS Fargate:** An AWS compute option that runs containers without requiring us to manage servers.
- **EC2:** AWS virtual servers that customers configure and maintain.
- **ECS Cluster:** A logical group used to organize ECS services and tasks.
- **Task Definition:** A configuration describing how ECS should run containers, including image, CPU, memory, and health checks.
- **Task Definition Revision:** A numbered version of an ECS task definition.
- **ECS Task:** A running or stopped instance of an ECS task definition.
- **ECS Service:** A resource that manages a specified number of tasks and application deployments.
- **Desired Count:** The number of tasks an ECS service should maintain.
- **Rolling Deployment:** A strategy that introduces new application tasks while gradually replacing previous tasks.
- **Health Check:** A test that determines whether an application container is functioning correctly.
- **Deployment Circuit Breaker:** An ECS feature that marks a deployment failed after its failure threshold is reached.
- **Rollback:** Restoring a previously successful deployment after a newer deployment fails.
- **CloudWatch Logs:** An AWS service that collects and stores application logs.
- **VPC:** A logically isolated virtual network within AWS.
- **Subnet:** A range of IP addresses inside a VPC where AWS resources can be placed.
- **Public IP Address:** An internet-routable address assigned to a resource.
- **Security Group:** A virtual firewall controlling allowed network traffic for AWS resources.
- **NAT Gateway:** An AWS networking service that provides outbound connectivity for resources in private subnets.
- **Application Load Balancer:** An AWS service that distributes incoming HTTP or HTTPS traffic across application targets.

## Security and Identity

- **IAM:** AWS Identity and Access Management, which controls permissions for AWS identities.
- **IAM User:** An AWS identity that can have long-term credentials and assigned permissions.
- **IAM Role:** An AWS identity whose permissions can be assumed temporarily by trusted entities.
- **IAM Policy:** A document specifying which AWS actions are allowed or denied.
- **Trust Policy:** A policy defining which identities may assume an IAM role.
- **Least Privilege:** Giving an identity only the permissions needed to perform its tasks.
- **OIDC:** An identity protocol that lets GitHub Actions authenticate to AWS using verified identity tokens.
- **Federation:** Allowing an identity from one system, such as GitHub, to access another system, such as AWS, through a trust relationship.
- **Temporary Credentials:** Short-lived authentication credentials that expire automatically.
- **Access Key:** A credential used to authenticate programmatic requests to AWS.
- **STS:** AWS Security Token Service, which issues temporary credentials for authorized identities.
- **iam:PassRole:** An IAM permission allowing an identity to pass a specified role to an AWS service.
- **Secret:** Sensitive authentication data, such as a password, token, or access key, that must be protected.

## Terraform and Infrastructure as Code

- **Infrastructure as Code (IaC):** Defining and managing infrastructure through configuration files instead of manual setup.
- **Terraform:** An Infrastructure as Code tool used to provision and manage AWS resources.
- **Provider:** A Terraform plugin that communicates with a platform such as AWS.
- **Resource:** A Terraform block describing infrastructure that Terraform should manage.
- **Data Source:** A Terraform block that reads information about existing infrastructure.
- **Variable:** An input that makes Terraform configuration reusable and configurable.
- **Output:** A value Terraform displays or exposes after evaluating infrastructure configuration.
- **Terraform State:** Terraform's record of the infrastructure resources it manages.
- **Backend:** The mechanism Terraform uses to store and access its state.
- **State Locking:** A mechanism that prevents conflicting operations from modifying the same Terraform state simultaneously.
- **terraform init:** A command that initializes a Terraform working directory and required providers.
- **terraform validate:** A command that checks Terraform configuration syntax and internal consistency.
- **terraform plan:** A command that previews the infrastructure changes Terraform proposes.
- **terraform apply:** A command that makes the approved infrastructure changes.
- **terraform destroy:** A command that removes resources tracked by the Terraform state.
- **Lifecycle Ignore Changes:** A Terraform setting that excludes selected resource attributes from routine update planning.
- **Configuration Drift:** A difference between an infrastructure resource's actual configuration and its declared configuration.
- **Amazon S3:** AWS object storage that can hold Terraform state files.
- **DynamoDB:** An AWS NoSQL database historically used for Terraform S3 backend locking.

## Architecture and Operations

- **Architecture:** The overall structure of a system and the relationships between its components.
- **ADR (Architecture Decision Record):** A document explaining an architectural decision, its alternatives, and consequences.
- **AWS Budget:** An AWS service used to monitor spending and send cost alerts.
- **Monitoring:** Observing system behavior, performance, and failures.
- **Deployment Evidence:** Logs, command outputs, or screenshots demonstrating that a deployment operation occurred.
- **Infrastructure Cleanup:** Stopping or deleting unnecessary cloud resources to control costs and reduce exposure.

## Kubernetes

- **Kubernetes (K8s):** An open-source platform for orchestrating containerized applications.
- **Cluster:** A group of Nodes managed by Kubernetes.
- **Node:** A machine that runs Kubernetes workloads.
- **Pod:** The smallest deployable Kubernetes unit, containing one or more containers.
- **Control Plane:** The components responsible for managing the Kubernetes cluster.
- **kubectl:** The command-line interface used to communicate with Kubernetes.
- **Minikube:** A tool for creating local Kubernetes clusters.
- **Kind:** A tool for running Kubernetes clusters using Docker containers.
- **Namespace:** A logical grouping of Kubernetes resources.
- **Docker Driver:** The Minikube configuration that uses Docker to run a local cluster.
- **Kubernetes Service:** A stable network endpoint for accessing a set of Pods.
- **ClusterIP:** A Service type that exposes an application internally within Kubernetes.
- **EndpointSlice:** A Kubernetes resource that tracks the network endpoints available behind a Service.
- **Selector:** A label-based rule used to identify matching Kubernetes resources.
- **Port forwarding:** A temporary connection between a local port and a Kubernetes resource.
- **Readiness probe:** A health check that determines whether a container can receive traffic.
- **Liveness probe:** A health check that can trigger a container restart after repeated failures.
- **Rolling update:** A controlled process for replacing application Pods with an updated configuration.
- **Rollout:** The process of deploying or updating a Kubernetes workload.
- **Kind:** Kubernetes IN Docker, a tool for creating temporary Kubernetes clusters using Docker containers.
- **GitHub Actions runner:** A computer that executes the jobs and steps in a GitHub Actions workflow.
- **Workflow trigger:** An event that starts a GitHub Actions workflow.
- **Smoke test:** A quick test that verifies a deployed application's essential functionality.
- **CI isolation:** Keeping automated testing workflows separate so changes to one don't unnecessarily affect another.
- **Exit code:** A number returned by a process indicating whether it succeeded or failed.
- **ErrImagePull:** Kubernetes failed to obtain the container image needed to start a Pod.
- **ImagePullBackOff:** Kubernetes is delaying repeated attempts to download a container image.
- **CrashLoopBackOff:** Kubernetes is delaying restarts of a container that repeatedly terminates.
- **Readiness Probe:** A check that determines whether a container is ready to receive traffic.
- **Liveness Probe:** A check that determines whether Kubernetes should restart an unhealthy container.
- **Exit Code:** A number returned when a process exits, where zero usually indicates success.
- **Pod Events:** Messages recording important Kubernetes actions, warnings, and failures.

## CI/CD Workflow Improvements

- **Change-based CI:** A CI configuration that runs workflows only when relevant files change.
- **Path Filter:** A GitHub Actions setting that determines which file changes trigger a workflow.
- **Workflow Dispatch:** A GitHub Actions event that allows a workflow to be started manually.
- **Deployment Guard:** A condition that restricts deployment to approved circumstances, such as running from the main branch.
- **Actionlint:** A tool that checks GitHub Actions workflows for configuration errors.
- **ShellCheck:** A tool that identifies potential problems in shell scripts.
- **Fast-forward:** A Git operation that advances a branch without creating an additional merge commit.
- **Staging Area:** The Git area where changes are selected before committing.
- **Best-effort Cleanup:** A cleanup operation that is attempted but cannot be guaranteed in every failure scenario.

## Monitoring and Observability

- **Monitoring:** Continuously collecting and reviewing measurements to understand an application's health and performance.
- **Observability:** Understanding a system's internal behavior through information such as metrics, logs, and traces.
- **Metric:** A numerical measurement describing system behavior or performance.
- **Prometheus:** A monitoring system that collects and stores metrics from applications.
- **Grafana:** A visualization platform used to create dashboards from monitoring data.
- **PromQL:** Prometheus Query Language, used to retrieve and calculate metrics.
- **Instrumentation:** Adding code to an application to collect measurements about its behavior.
- **Counter:** A metric that increases as events occur, such as HTTP requests.
- **Histogram:** A metric that records observations in buckets to analyze their distribution.
- **Scraping:** Prometheus periodically requesting metrics from an application's endpoint.
- **Scrape Interval:** The frequency at which Prometheus collects metrics from a target.
- **Target:** An application or service that Prometheus is configured to monitor.
- **Time Series:** Measurements recorded over time.
- **Request Rate:** The average number of HTTP requests handled per second.
- **Response Time (Latency):** The time an application takes to respond to a request.
- **HTTP 5xx Error:** A response indicating that the server encountered an error.
- **Docker Compose:** A tool for defining and running multiple connected containers using YAML.
- **Environment Variable:** A configuration value supplied to an application outside its source code.
- **Regression Test:** An automated test that checks whether existing behavior still works after changes.
- **npm audit:** A command that checks Node.js dependencies for known security vulnerabilities.
- **Dashboard Export:** A JSON configuration file used to preserve or recreate a Grafana dashboard.
- **NaN:** A value meaning Not a Number, which can appear when a calculation is undefined.
## Prometheus Alerting

- **Alert Rule:** A PromQL condition that Prometheus evaluates to detect a problem.
- **Alert Evaluation Interval:** How frequently Prometheus checks alert conditions.
- **Inactive:** An alert state indicating its condition is not currently satisfied.
- **Pending:** An alert state indicating its condition is satisfied but the required waiting period has not elapsed.
- **Firing:** An alert state indicating its condition has remained satisfied long enough to activate the alert.
- **`up` Metric:** A Prometheus metric that equals 1 when a scrape succeeds and 0 when it fails.
- **Alert Threshold:** A condition or limit used to decide when an alert should activate.
- **`for` Duration:** The time an alert condition must remain true before entering the Firing state.
- **Alert Recovery:** The transition back to Inactive when the alert condition is no longer satisfied.
- **promtool:** A Prometheus utility for validating configuration files, alert rules, and queries.
