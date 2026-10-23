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
