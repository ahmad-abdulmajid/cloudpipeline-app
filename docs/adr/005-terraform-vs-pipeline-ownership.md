# ADR-005: Terraform Owns Infrastructure, GitHub Actions Owns Image Versions

**Status:** Accepted  
**Project:** CloudPipeline  
**Date:** October 2026

## Context

CloudPipeline uses Terraform to create AWS infrastructure and GitHub Actions to deploy new application versions.

Both tools interact with the Amazon ECS service and task definitions.

Without clearly defined ownership, Terraform could unintentionally replace a newer application deployment with an older image reference.

We needed a strategy that allows infrastructure and application deployments to evolve independently.

## Decision

Separate infrastructure management from application deployment management.

**Terraform owns the AWS infrastructure structure**, including:

- Amazon ECR repository and lifecycle policy.
- Amazon ECS cluster and service configuration.
- Initial ECS task definition.
- CloudWatch log group.
- IAM roles and policies.
- Networking and security group.
- ECS deployment circuit breaker configuration.

**GitHub Actions owns application image versions**, including:

- Testing application code.
- Building Docker images.
- Tagging images using Git commit SHAs.
- Pushing images to Amazon ECR.
- Registering new ECS task definition revisions.
- Updating the ECS service to use the new revision.

The ECS service normally has a desired task count of zero to limit costs.

A separate manual GitHub Actions workflow temporarily starts a Fargate task, performs a `/health` smoke test, and scales the service down afterward.

## Terraform Lifecycle Configuration

The ECS service uses:

```hcl
lifecycle {
  ignore_changes = [
    task_definition,
    desired_count
  ]
}
```

This prevents routine Terraform operations from overwriting the task definition selected by the deployment pipeline or resetting the task count changed during testing.

The Terraform-managed task definition also uses:

```hcl
lifecycle {
  ignore_changes = [
    container_definitions
  ]
}
```

This avoids Terraform continually trying to reset the initial container image configuration.

These lifecycle settings do not protect against every possible resource replacement or manual configuration change. Their purpose is to establish a practical ownership boundary for the current project.

## Alternatives Considered

### Terraform Manages Every Application Release

**Advantages:**
- Infrastructure and application configuration are managed through one tool.
- Changes can be reviewed using Terraform plans.

**Disadvantages:**
- Every new Docker image requires updating Terraform-managed configuration.
- Application delivery becomes coupled to infrastructure operations.
- Increases the risk of unnecessary infrastructure changes during routine releases.

### GitHub Actions Manages All AWS Infrastructure

**Advantages:**
- One automation platform handles deployments and infrastructure changes.

**Disadvantages:**
- Requires implementing infrastructure management in the pipeline.
- Makes separation of responsibilities less clear.
- Adds operational complexity to normal application deployments.

## Consequences

### Positive

- Application updates do not require Terraform applies.
- Terraform retains control over infrastructure structure.
- GitHub Actions can release new image versions independently.
- Immutable Git SHA image tags improve traceability.
- The separation reduces accidental deployment configuration conflicts.

### Negative

- Terraform does not fully track the currently deployed application image.
- ECS task definition revisions are created outside Terraform.
- Investigating deployments requires checking GitHub Actions and ECS.
- Lifecycle ignore rules can hide some configuration drift.

## Problem Encountered and Fix

During rollback testing, we registered an intentionally broken ECS task definition with the health-check command:

```json
["CMD-SHELL", "exit 1"]
```

Our GitHub Actions workflow originally retrieved the latest registered task definition and changed only its Docker image.

This caused a later task definition revision to inherit the broken health check.

We corrected the workflow to retrieve the task definition currently selected by the ECS service instead of blindly using the latest registered revision.

The subsequent pipeline run created revision 12 with the correct `/health` check, and we verified that the application was healthy.

This improvement reduces the risk of copying an unrelated latest revision, but it does not guarantee that the service-selected revision is healthy. A version-controlled task definition template would provide stronger configuration consistency.

## Security and Operational Considerations

- GitHub Actions authenticates to AWS using OIDC instead of stored long-lived keys.
- The deployment IAM role uses scoped ECR, ECS, and `iam:PassRole` permissions.
- Terraform state remains private.
- The ECR lifecycle policy removes older images according to its retention configuration.
- ECS desired count remains zero outside testing.
- The deployment circuit breaker supports recovery from unhealthy deployments.

## Outcome

The ownership separation allowed CloudPipeline to build and publish Docker images automatically while preserving Terraform-managed infrastructure.

The pipeline successfully registered healthy task definition revision 12.

During failure testing, AWS ECS recorded `ROLLBACK_SUCCESSFUL` after the circuit breaker reached its threshold of three failed tasks.

The project demonstrated independent infrastructure management, application versioning, failure detection, and deployment recovery.
