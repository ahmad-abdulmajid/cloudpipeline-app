# ADR-001: AWS Fargate vs. Amazon EC2

**Status:** Accepted  
**Project:** CloudPipeline  
**Date:** October 2026

## Context

CloudPipeline needs an AWS environment to run a containerized Node.js application.

The environment must support automated deployments, container health checks, CloudWatch logging, and recovery from failed deployments.

This is a portfolio project with a limited budget, so operational simplicity and cost control are important.

## Decision

Use **Amazon ECS with AWS Fargate** to run the application.

Fargate allows ECS to run Docker containers without requiring us to provision or manage EC2 instances.

The application uses:

- 0.25 vCPU and 0.5 GB memory.
- A public subnet and public IP address.
- An ECS service with desired count 0 by default.
- CloudWatch Logs for container output.
- ECS container health checks and deployment circuit breaker.

We start the service only when testing or demonstrating the application.

## Alternatives Considered

### Amazon ECS on EC2

Advantages:
- More control over the underlying server.
- Potential cost savings depending on instance eligibility and utilization.

Disadvantages:
- Requires EC2 instance management.
- Requires operating system patching and server maintenance.
- Adds infrastructure complexity.

### AWS Lambda

Advantages:
- No continuously running server required.
- Can be cost-effective for infrequent requests.

Disadvantages:
- Uses a different execution model.
- Less suitable for demonstrating traditional ECS container deployments and rolling updates.

## Consequences

### Positive

- No EC2 instance management.
- Simpler infrastructure for a small CI/CD portfolio project.
- Supports ECS health checks and automatic deployment rollback.
- Integrates with Terraform, IAM, ECR, GitHub Actions, and CloudWatch.

### Negative

- Fargate compute is billable when tasks run.
- Public IPv4 addresses may generate additional charges.
- Limited control over the underlying operating system.
- Requires careful shutdown after experiments.

## Cost and Security Considerations

- An AWS Budget alert helps monitor spending but does not enforce a hard limit.
- The ECS service defaults to zero desired tasks.
- Tasks are stopped after deployment tests.
- No NAT Gateway or Application Load Balancer is permanently provisioned in version
